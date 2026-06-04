# Sonidos del juego

Pon aquí los archivos `.mp3` (o `.wav`) con **exactamente** estos nombres.
Cada uno se reproduce automáticamente cuando ocurre el evento.

Si un archivo no existe, simplemente no suena (no rompe nada).

| Archivo                | Cuándo suena                                                                          |
| ---------------------- | ------------------------------------------------------------------------------------- |
| `question-start.mp3`   | Al activar una pregunta nueva                                                         |
| `face-off.mp3`         | Cuando aparece el overlay "🥊 CARA A CARA 🥊" (esperando buzzer)                      |
| `buzz.mp3`             | Cuando se marca quién buzzeó primero                                                  |
| `face-off-miss.mp3`    | Cuando un equipo falla su respuesta de cara a cara                                    |
| `winner-buzzer.mp3`    | Cuando se resuelve el cara a cara y un equipo toma el control                         |
| `correct.mp3`          | Al revelar una respuesta correcta                                                     |
| `wrong.mp3`            | Al marcar un ✗ ERROR                                                                  |
| `steal.mp3`            | Cuando se activa el ROBO (tras 3 errores)                                             |
| `steal-success.mp3`    | Si el robo se concreta (rival se lleva los puntos)                                    |
| `steal-fail.mp3`       | Si el robo falla (equipo en control se lleva los puntos)                              |
| `match-win.mp3`        | Cuando se cierra una llave (L1 o L2 finalizada)                                       |
| `champion.mp3`         | Cuando se cierra la Final (gana el torneo)                                            |
| `tick.mp3`             | (Opcional) Al sumar puntos al marcador en juego                                       |

## Formato recomendado

- `.mp3` mono o estéreo, 44.1 kHz, 128–192 kbps
- Duración corta para efectos (1–4 s)
- Sin silencio inicial largo (efectos cortados al principio se sienten lentos)

## Ajustar volumen

Volumen por defecto: 0.7. Cambiar en `frontend/src/hooks/useSound.ts`.

## Probar manualmente

Abrir en navegador: `http://localhost:5173/sounds/face-off.mp3` — debe descargar/reproducir.
