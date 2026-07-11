# Roteiro de teste — captura de legendas (Mau + Laura)

Teste multi-participante para validar a captura de legendas do Google Meet.
Cada fase exercita um comportamento específico medido pelo `caption-probe.js`.

**O que cada fase prova** (referência para o Mau):

| Fase | Objetivo | Métrica no probe |
|---|---|---|
| 1 | Rótulos de quem fala (`Você`→"You", Laura→nome real) | `items[].speaker` |
| 2 | Troca limpa entre quem fala | linhas distintas |
| 3 | Fala simultânea → dois itens ao mesmo tempo | `maxConcurrent > 1` |
| 4 | Pausa no meio do turno (limite do debounce) | `shrinkEvents` |
| 5 | Um turno longo que cresce | acúmulo em um item |

---

## Antes de começar

1. Os dois entram na **mesma chamada** do Meet.
2. Ativem as legendas (tecla **`c`**), idioma **Português**.
3. **Mau** cola o `dev/caption-probe.js` no console (DevTools). Deve aparecer `[probe] recording`.
4. Sigam as falas abaixo. O símbolo **⏸ (Xs)** = os dois em **silêncio** por X segundos (importante — é o que separa os turnos!).

---

## Fase 1 — Fala individual (linha de base)

> **Mau:** "Teste um. Aqui é o Mau falando sozinho."
>
> ⏸ (3s)
>
> **Laura:** "Teste dois. Aqui é a Laura falando sozinha."
>
> ⏸ (3s)

## Fase 2 — Alternância rápida (troca de quem fala)

> **Mau:** "Laura, você me ouve?"
>
> **Laura:** "Ouço sim, Mau."
>
> **Mau:** "Ótimo, vamos continuar."
>
> **Laura:** "Combinado."
>
> ⏸ (3s)

## Fase 3 — Fala simultânea ⭐ (a pergunta principal)

Os dois falam **ao mesmo tempo**, contando devagar por ~5 segundos.
Comecem juntos, na contagem de 3.

> **Mau:** "Um, dois, três, quatro, cinco, seis, sete, oito."
>
> **Laura:** "Segunda, terça, quarta, quinta, sexta, sábado, domingo."
>
> ⏸ (3s)

## Fase 4 — Pausa no meio da fala ⭐ (o limite do debounce)

> **Mau:** "Esta frase começa agora…"
>
> ⏸ (4s — silêncio total, sem completar)
>
> **Mau (continua a MESMA frase):** "…e termina depois de uma pausa longa."
>
> ⏸ (3s)
>
> **Laura:** "A Laura também começa uma ideia…"
>
> ⏸ (4s)
>
> **Laura (continua):** "…e conclui depois de parar no meio."
>
> ⏸ (3s)

## Fase 5 — Monólogo longo (acúmulo de turno)

Laura fala frases seguidas, **sem pausas longas** entre elas:

> **Laura:** "Agora eu vou falar várias frases seguidas. Esta é a primeira. Esta é a segunda. Esta é a terceira. E esta é a última do monólogo."
>
> ⏸ (3s)

## Fase 6 — Encerrar

> **Mau** roda no console:
>
> ```js
> __probe.report()
> ```

---

## Depois do teste

- Se a extensão do Claude estiver conectada ao rodar `__probe.report()`, avise —
  eu leio `__probe.recs` direto e analiso.
- Senão, cole aqui a saída do `report()` (e, se der, `JSON.stringify(__probe.recs)`).

**O ponto crítico é a Fase 3:** sobreponham as vozes de verdade (comecem juntos no 3).
É a única forma de forçar o Meet a renderizar dois itens de legenda ao mesmo tempo.
