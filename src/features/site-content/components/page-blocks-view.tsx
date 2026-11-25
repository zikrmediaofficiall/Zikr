import Link from "next/link";
import type { PageBlock } from "../pages/page-blocks";

/** Renders validated blocks only. There is no raw HTML path. */
export function PageBlocksView({ blocks }: { blocks: PageBlock[] }) {
  return (
    <div className="space-y-5 leading-8 text-brand-cream/80">
      {blocks.map((block, index) => {
        switch (block.type) {
          case "heading":
            return block.level === 2
              ? <h2 key={index} className="pt-3 text-2xl font-bold text-brand-gold">{block.text}</h2>
              : <h3 key={index} className="pt-2 text-xl font-semibold text-brand-gold/90">{block.text}</h3>;
          case "paragraph":
            return <p key={index} className="whitespace-pre-line">{block.text}</p>;
          case "callout":
            return <aside key={index} className="whitespace-pre-line rounded-2xl border border-brand-gold/20 bg-brand-gold/5 p-4">{block.text}</aside>;
          case "links":
            return (
              <ul key={index} className="space-y-2">
                {block.items.map((item) => (
                  <li key={item.href + item.label}>
                    {item.href.startsWith("/")
                      ? <Link href={item.href} className="text-brand-gold hover:underline">{item.label}</Link>
                      : <a href={item.href} rel="noopener noreferrer" target="_blank" className="text-brand-gold hover:underline">{item.label}</a>}
                  </li>
                ))}
              </ul>
            );
          case "image":
            // Cloudinary only (validated). A plain img avoids adding image domains to the Next config.
            // eslint-disable-next-line @next/next/no-img-element
            return <img key={index} src={block.src} alt={block.alt} loading="lazy" className="w-full rounded-2xl" />;
          case "cta":
            return block.href.startsWith("/")
              ? <Link key={index} href={block.href} className="inline-block rounded-xl bg-brand-gold px-5 py-2.5 font-semibold text-black">{block.label}</Link>
              : <a key={index} href={block.href} rel="noopener noreferrer" target="_blank" className="inline-block rounded-xl bg-brand-gold px-5 py-2.5 font-semibold text-black">{block.label}</a>;
        }
      })}
    </div>
  );
}
