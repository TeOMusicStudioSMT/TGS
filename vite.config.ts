import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base './' — apka jedzie też serwowana przez most pod /apps/games (USB V_ZERO
// nie ma serwera dev, most 3001 zawsze żyje).
//
// ⚠️ PORT 5177, NIE 5176. Na 5176 siedzi SAMA KATEDRA (Start_OtakOS.bat:
// „Rozpalanie UI (Vite :5176)" i potem otwiera http://localhost:5176). Gdy TGS
// zajmie 5176 pierwszy, bat otwiera bramę prosto w gry zamiast w Katedrę.
// Zajęte: 5173 Music V2 · 5174 Story V2 · 5175 App V2 · 5176 KATEDRA · 5177 TGS.
export default defineConfig({
  base: './',
  plugins: [react()],
  server: { port: 5177 },
  preview: { allowedHosts: true, host: true, port: 5177 },
})
