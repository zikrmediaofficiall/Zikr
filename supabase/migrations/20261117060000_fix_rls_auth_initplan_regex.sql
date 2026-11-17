-- Repair the over-escaped regexp patterns in the historical 20260814143804
-- and 20260814143905 migrations. With standard_conforming_strings=on those
-- patterns match a literal backslash rather than auth.uid()/auth.jwt().
--
-- Rewrite only SQL function-call tokens from pg_get_expr output. A raw regex
-- over the deparsed expression can also match text inside string literals or
-- quoted identifiers (for example a JSON key named "auth.uid()"), changing a
-- policy's meaning or making ALTER POLICY fail. The scanner below preserves
-- quoted tokens and wraps only actual auth.uid()/auth.jwt() calls.
DO $$
DECLARE
  policy_row record;
  expression_kind text;
  expression_source text;
  rewritten_expression text;
  prefix_text text;
  current_char text;
  next_char text;
  escape_string boolean;
  in_single_quote boolean;
  in_double_quote boolean;
  already_wrapped boolean;
  expression_length integer;
  position_index integer;
  call_text text;
BEGIN
  FOR policy_row IN
    SELECT schemaname, tablename, policyname, qual, with_check
    FROM pg_policies
    WHERE schemaname = 'public'
      AND (
        coalesce(qual, '') ~* 'auth\.uid\(\)|auth\.jwt\(\)'
        OR coalesce(with_check, '') ~* 'auth\.uid\(\)|auth\.jwt\(\)'
      )
  LOOP
    FOREACH expression_kind IN ARRAY ARRAY['qual', 'with_check'] LOOP
      expression_source := CASE expression_kind
        WHEN 'qual' THEN policy_row.qual
        ELSE policy_row.with_check
      END;

      IF expression_source IS NULL THEN
        CONTINUE;
      END IF;

      rewritten_expression := '';
      expression_length := length(expression_source);
      position_index := 1;
      in_single_quote := false;
      in_double_quote := false;
      escape_string := false;

      WHILE position_index <= expression_length LOOP
        current_char := substr(expression_source, position_index, 1);
        next_char := CASE
          WHEN position_index < expression_length
            THEN substr(expression_source, position_index + 1, 1)
          ELSE ''
        END;

        IF in_single_quote THEN
          rewritten_expression := rewritten_expression || current_char;

          IF escape_string AND current_char = chr(92) AND next_char <> '' THEN
            rewritten_expression := rewritten_expression || next_char;
            position_index := position_index + 2;
            CONTINUE;
          END IF;

          IF current_char = '''' THEN
            IF next_char = '''' THEN
              rewritten_expression := rewritten_expression || next_char;
              position_index := position_index + 2;
              CONTINUE;
            END IF;
            in_single_quote := false;
            escape_string := false;
          END IF;

          position_index := position_index + 1;
          CONTINUE;
        END IF;

        IF in_double_quote THEN
          rewritten_expression := rewritten_expression || current_char;

          IF current_char = '"' THEN
            IF next_char = '"' THEN
              rewritten_expression := rewritten_expression || next_char;
              position_index := position_index + 2;
              CONTINUE;
            END IF;
            in_double_quote := false;
          END IF;

          position_index := position_index + 1;
          CONTINUE;
        END IF;

        IF current_char = '''' THEN
          escape_string := position_index > 1
            AND lower(substr(expression_source, position_index - 1, 1)) = 'e'
            AND (
              position_index = 2
              OR substr(expression_source, position_index - 2, 1) !~ '[[:alnum:]_$]'
            );
          in_single_quote := true;
          rewritten_expression := rewritten_expression || current_char;
          position_index := position_index + 1;
          CONTINUE;
        END IF;

        IF current_char = '"' THEN
          in_double_quote := true;
          rewritten_expression := rewritten_expression || current_char;
          position_index := position_index + 1;
          CONTINUE;
        END IF;

        call_text := CASE
          WHEN lower(substr(expression_source, position_index, 10)) = 'auth.uid()'
            THEN substr(expression_source, position_index, 10)
          WHEN lower(substr(expression_source, position_index, 10)) = 'auth.jwt()'
            THEN substr(expression_source, position_index, 10)
          ELSE NULL
        END;

        IF call_text IS NOT NULL
           AND (
             position_index = 1
             OR substr(expression_source, position_index - 1, 1) !~ '[[:alnum:]_$.]'
           ) THEN
          prefix_text := rtrim(rewritten_expression);
          WHILE prefix_text <> '' AND right(prefix_text, 1) = '(' LOOP
            prefix_text := rtrim(left(prefix_text, length(prefix_text) - 1));
          END LOOP;

          already_wrapped := lower(right(prefix_text, 6)) = 'select'
            AND (
              length(prefix_text) = 6
              OR substr(prefix_text, length(prefix_text) - 6, 1) !~ '[[:alnum:]_$]'
            );

          IF already_wrapped THEN
            rewritten_expression := rewritten_expression || call_text;
          ELSE
            rewritten_expression := rewritten_expression || '(select ' || call_text || ')';
          END IF;

          position_index := position_index + 10;
          CONTINUE;
        END IF;

        rewritten_expression := rewritten_expression || current_char;
        position_index := position_index + 1;
      END LOOP;

      IF rewritten_expression IS DISTINCT FROM expression_source THEN
        EXECUTE format(
          'ALTER POLICY %I ON %I.%I %s %s',
          policy_row.policyname,
          policy_row.schemaname,
          policy_row.tablename,
          CASE expression_kind
            WHEN 'qual' THEN 'USING'
            ELSE 'WITH CHECK'
          END,
          rewritten_expression
        );
      END IF;
    END LOOP;
  END LOOP;
END
$$;
