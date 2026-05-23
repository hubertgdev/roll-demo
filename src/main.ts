import RAPIER from '@dimforge/rapier3d-compat'
import { App } from './app'
import './style.css'

await RAPIER.init()

const app = new App()
app.start()

document.getElementById('roll-btn')?.addEventListener('click', () => app.roll())
