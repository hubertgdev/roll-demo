import RAPIER from '@dimforge/rapier3d-compat'
import { App } from './app'
import './style.css'

await RAPIER.init()

const app = new App()
app.start()

function readForce(id: string, fallback: number): number {
  const el = document.getElementById(id)
  return el instanceof HTMLInputElement ? Math.max(1, Number(el.value)) : fallback
}

document.getElementById('roll-btn')?.addEventListener('click', () => {
  const min = readForce('min-force', 10)
  const max = readForce('max-force', 20)
  app.roll(Math.min(min, max), Math.max(min, max))
})
