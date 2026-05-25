import { ImageResponse } from 'next/og'

// Route segment config
export const runtime = 'edge'

// Image metadata
export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

// Image generation
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '6px',
          background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
        }}
      >
        <span
          style={{
            fontSize: '20px',
            fontWeight: 700,
            color: 'white',
            fontFamily: 'Arial, sans-serif',
          }}
        >
          M
        </span>
      </div>
    ),
    {
      ...size,
    }
  )
}
