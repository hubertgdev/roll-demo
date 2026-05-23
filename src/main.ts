import RAPIER from '@dimforge/rapier3d-compat'
import { App } from './app'
import './style.css'

await RAPIER.init()

const app = new App()
app.start()

function readInput(id: string, fallback: number): number {
  const el = document.getElementById(id)
  return el instanceof HTMLInputElement ? Math.max(1, Number(el.value)) : fallback
}

document.getElementById('roll-btn')?.addEventListener('click', () => {
  const minF = readInput('min-force', 10)
  const maxF = readInput('max-force', 20)
  const minT = readInput('min-torque', 10)
  const maxT = readInput('max-torque', 30)
  app.roll(Math.min(minF, maxF), Math.max(minF, maxF), Math.min(minT, maxT), Math.max(minT, maxT))
})
