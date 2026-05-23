import * as THREE from 'three'

// pip positions [nx, ny] in 0-1 UV space, for faces 1-6
const PIP_LAYOUTS: [number, number][][] = [
  [[0.5, 0.5]],
  [
    [0.3, 0.3],
    [0.7, 0.7],
  ],
  [
    [0.3, 0.3],
    [0.5, 0.5],
    [0.7, 0.7],
  ],
  [
    [0.3, 0.3],
    [0.7, 0.3],
    [0.3, 0.7],
    [0.7, 0.7],
  ],
  [
    [0.3, 0.3],
    [0.7, 0.3],
    [0.5, 0.5],
    [0.3, 0.7],
    [0.7, 0.7],
  ],
  [
    [0.3, 0.22],
    [0.7, 0.22],
    [0.3, 0.5],
    [0.7, 0.5],
    [0.3, 0.78],
    [0.7, 0.78],
  ],
]

function makeFaceTexture(n: number): THREE.CanvasTexture {
  const S = 256
  const canvas = document.createElement('canvas')
  canvas.width = S
  canvas.height = S
  const ctx = canvas.getContext('2d')
  if (!ctx) return new THREE.CanvasTexture(canvas)

  // Rounded ivory background
  const r = 28
  ctx.fillStyle = '#f0eadc'
  ctx.beginPath()
  ctx.moveTo(r, 0)
  ctx.lineTo(S - r, 0)
  ctx.arcTo(S, 0, S, r, r)
  ctx.lineTo(S, S - r)
  ctx.arcTo(S, S, S - r, S, r)
  ctx.lineTo(r, S)
  ctx.arcTo(0, S, 0, S - r, r)
  ctx.lineTo(0, r)
  ctx.arcTo(0, 0, r, 0, r)
  ctx.closePath()
  ctx.fill()

  // Pips
  const pipR = S * 0.088
  ctx.fillStyle = '#1a100e'
  for (const [nx, ny] of PIP_LAYOUTS[n - 1] ?? []) {
    ctx.beginPath()
    ctx.arc(nx * S, ny * S, pipR, 0, Math.PI * 2)
    ctx.fill()
  }

  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

// Returns 6 textures: face 1 at index 0, face 6 at index 5
export function createDieTextures(): THREE.CanvasTexture[] {
  return [1, 2, 3, 4, 5, 6].map(makeFaceTexture)
}
