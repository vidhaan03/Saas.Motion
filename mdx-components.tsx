import type { MDXComponents } from "mdx/types";
import type { ComponentPropsWithoutRef } from "react";

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    h1: (props: ComponentPropsWithoutRef<"h1">) => (
      <h1
        className="mb-4 mt-2 text-3xl font-medium tracking-tight text-[#2D2A26]"
        {...props}
      />
    ),
    h2: (props: ComponentPropsWithoutRef<"h2">) => (
      <h2
        className="mb-3 mt-10 border-b border-[#D4CCBC] pb-2 text-xl font-medium tracking-tight text-[#2D2A26]"
        {...props}
      />
    ),
    h3: (props: ComponentPropsWithoutRef<"h3">) => (
      <h3
        className="mb-2 mt-6 text-base font-medium tracking-tight text-[#2D2A26]"
        {...props}
      />
    ),
    p: (props: ComponentPropsWithoutRef<"p">) => (
      <p className="my-4 text-[15px] leading-[1.7] text-[#3C3933]" {...props} />
    ),
    a: (props: ComponentPropsWithoutRef<"a">) => (
      <a
        className="border-b border-[#A39C8F] text-[#2D2A26] transition hover:border-[#2D2A26]"
        {...props}
      />
    ),
    ul: (props: ComponentPropsWithoutRef<"ul">) => (
      <ul className="my-4 ml-5 list-disc space-y-1.5 text-[15px] text-[#3C3933] marker:text-[#A39C8F]" {...props} />
    ),
    ol: (props: ComponentPropsWithoutRef<"ol">) => (
      <ol className="my-4 ml-5 list-decimal space-y-1.5 text-[15px] text-[#3C3933] marker:text-[#A39C8F]" {...props} />
    ),
    li: (props: ComponentPropsWithoutRef<"li">) => (
      <li className="leading-[1.7]" {...props} />
    ),
    code: (props: ComponentPropsWithoutRef<"code">) => (
      <code
        className="rounded bg-[#EFE9DC] px-1.5 py-0.5 font-mono text-[13px] text-[#2D2A26]"
        {...props}
      />
    ),
    pre: (props: ComponentPropsWithoutRef<"pre">) => (
      <pre
        className="my-5 overflow-x-auto rounded-lg border border-[#D4CCBC] bg-[#EFE9DC] p-4 font-mono text-[12px] leading-[1.6] text-[#2D2A26]"
        {...props}
      />
    ),
    blockquote: (props: ComponentPropsWithoutRef<"blockquote">) => (
      <blockquote
        className="my-5 border-l-2 border-[#2D2A26] pl-4 italic text-[#3C3933]"
        {...props}
      />
    ),
    hr: (props: ComponentPropsWithoutRef<"hr">) => (
      <hr className="my-10 border-t border-[#D4CCBC]" {...props} />
    ),
    table: (props: ComponentPropsWithoutRef<"table">) => (
      <div className="my-5 overflow-x-auto">
        <table
          className="w-full border-collapse text-left text-[14px] text-[#3C3933]"
          {...props}
        />
      </div>
    ),
    th: (props: ComponentPropsWithoutRef<"th">) => (
      <th
        className="border-b border-[#A39C8F] px-3 py-2 font-mono text-[11px] uppercase tracking-widest text-[#6B655C]"
        {...props}
      />
    ),
    td: (props: ComponentPropsWithoutRef<"td">) => (
      <td className="border-b border-[#D4CCBC] px-3 py-2" {...props} />
    ),
    strong: (props: ComponentPropsWithoutRef<"strong">) => (
      <strong className="font-medium text-[#2D2A26]" {...props} />
    ),
    ...components,
  };
}
