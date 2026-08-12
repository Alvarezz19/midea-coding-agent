import 'streamdown/styles.css'

import { code } from '@streamdown/code'
import { type Components, Streamdown, type UrlTransform } from 'streamdown'

function safeMediaUrl(url: string, allowDataImage = false): string | null {
  try {
    const parsed = new URL(url, typeof window === 'undefined' ? 'http://midea.local' : window.location.origin)

    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.toString()
    }

    if (allowDataImage && parsed.protocol === 'data:' && url.toLowerCase().startsWith('data:image/')) {
      return url
    }
  } catch {
    return null
  }

  return null
}

export const safeMarkdownUrl: UrlTransform = (url, key) => safeMediaUrl(url, key === 'src')

function SafeImage(props: React.ComponentProps<'img'>) {
  const src = props.src ? safeMediaUrl(props.src, true) : null

  return src ? <img {...props} alt={props.alt || '媒体'} src={src} /> : null
}

function SafeVideo(props: React.ComponentProps<'video'>) {
  const src = props.src ? safeMediaUrl(props.src) : null

  return src ? <video {...props} controls playsInline src={src} /> : null
}

function SafeAudio(props: React.ComponentProps<'audio'>) {
  const src = props.src ? safeMediaUrl(props.src) : null

  return src ? <audio {...props} controls src={src} /> : null
}

function SafeIframe(props: React.ComponentProps<'iframe'>) {
  const src = props.src ? safeMediaUrl(props.src) : null

  return src ? <iframe {...props} allow="fullscreen" loading="lazy" referrerPolicy="no-referrer" sandbox="allow-scripts allow-same-origin allow-presentation" src={src} title={props.title || '媒体'} /> : null
}

const mediaComponents = { audio: SafeAudio, iframe: SafeIframe, img: SafeImage, video: SafeVideo } as unknown as Components

export function MarkdownContent({ text }: { text: string }) {
  return (
    <div className="markdown-content">
      <Streamdown
        allowedTags={{
          audio: ['src', 'controls'],
          iframe: ['src', 'title', 'width', 'height', 'allow', 'allowfullscreen', 'loading', 'referrerpolicy', 'sandbox'],
          source: ['src', 'type'],
          video: ['src', 'controls', 'poster', 'width', 'height']
        }}
        animated
        components={mediaComponents}
        linkSafety={{ enabled: true }}
        plugins={{ code }}
        urlTransform={safeMarkdownUrl}
      >
        {text}
      </Streamdown>
    </div>
  )
}
