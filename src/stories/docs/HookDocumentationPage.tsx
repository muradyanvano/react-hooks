import { Primary, Stories, Title } from '@storybook/addon-docs/blocks'

import { CodeBlock } from '../components/CodeBlock'
import { getHookDoc } from './catalog'
import type { HookName } from './types'

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="not-prose mb-8 space-y-3">
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      <div className="space-y-3 text-sm leading-7 text-slate-700">
        {children}
      </div>
    </section>
  )
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-1.5 pl-5">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  )
}

export function HookDocumentationPage({ hookName }: { hookName: HookName }) {
  const doc = getHookDoc(hookName)

  return (
    <div className="sb-unstyled mx-auto max-w-3xl px-2 py-6 font-sans text-slate-900">
      <Title />
      <p className="mb-6 text-base leading-7 text-slate-600">{doc.purpose}</p>

      <Section title="Overview">
        <p>{doc.overview}</p>
      </Section>

      <Section title="When to use">
        <BulletList items={doc.whenToUse} />
      </Section>

      <Section title="When not to use">
        <BulletList items={doc.whenNotToUse} />
      </Section>

      <Section title="Installation">
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
            1.0.0 · stable
          </span>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
            npm install @muradyanvano/react-hooks
          </span>
        </div>
        <p>
          Install from npm. Interactive documentation is also available on{' '}
          <a
            className="font-medium text-indigo-700 underline-offset-2 hover:underline"
            href="https://muradyanvano1995.github.io/react-hooks/"
            rel="noreferrer"
            target="_blank"
          >
            GitHub Pages
          </a>
          .
        </p>
      </Section>

      <Section title="Import">
        <CodeBlock code={doc.importExample} language="tsx" title="import" />
      </Section>

      <Section title="Signature">
        <CodeBlock code={doc.signature} language="tsx" title="typescript" />
      </Section>

      <Section title="Parameters">
        <dl className="space-y-3">
          {doc.parameters.map((param) => (
            <div key={param.name}>
              <dt className="font-mono text-xs font-semibold text-indigo-700">
                {param.name}
              </dt>
              <dd className="mt-1 text-slate-700">{param.description}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <Section title="Return values">
        <p>{doc.returnValues}</p>
      </Section>

      <Section title="Defaults">
        <CodeBlock code={doc.defaults} language="tsx" title="defaults" />
      </Section>

      <Section title="Runtime behavior">
        <BulletList items={doc.runtimeBehavior} />
      </Section>

      <Section title="SSR behavior">
        <p>{doc.ssrBehavior}</p>
      </Section>

      <Section title="React Strict Mode behavior">
        <p>{doc.strictModeBehavior}</p>
      </Section>

      <Section title="Accessibility">
        <p>{doc.accessibility}</p>
      </Section>

      <Section title="Browser / platform limitations">
        <BulletList items={doc.limitations} />
      </Section>

      {doc.relatedHooks.length > 0 ? (
        <Section title="Related hooks">
          <ul className="flex flex-wrap gap-2">
            {doc.relatedHooks.map((related) => (
              <li key={related}>
                <a
                  className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-800 no-underline hover:bg-indigo-100"
                  href={`?path=/docs/hooks-${related.toLowerCase()}--documentation`}
                  target="_top"
                >
                  {related}
                </a>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      <Section title="Interactive examples">
        <p>
          The primary example appears first. Additional stories demonstrate edge
          cases and integration patterns.
        </p>
        <Primary />
        <Stories />
      </Section>

      <Section title="Example source disclosure">
        <p>
          Each example includes Show code / Hide code and Copy code controls.
          Snippets show consumer usage of the public API. Example styling uses
          Tailwind for Storybook only — the hooks package does not require
          Tailwind.
        </p>
      </Section>
    </div>
  )
}
