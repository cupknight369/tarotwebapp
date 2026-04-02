import Alpine from 'alpinejs'
import { getCardsByDeckId } from '../lib/decks.js'
import { listLocalCardsByDeckId, updateLocalCard } from '../lib/localDecks.js'
import type { TarotCard } from '../types/canvas.js'

type OpenDeckEditDetail = { deckId?: string; deckTitle?: string }

Alpine.data('deckEditComponent', () => ({
  open: false,
  deckId: null as string | null,
  deckTitle: '',
  cards: [] as TarotCard[],
  localEmpty: false,
  loading: false,
  saveError: null as string | null,
  selectedCardId: null as string | null,
  editTitle: '',
  editNumber: 1,
  clearCensor: false,

  clearFileInputs() {
    const main = document.getElementById('deck-edit-main') as HTMLInputElement | null
    const censor = document.getElementById('deck-edit-censor') as HTMLInputElement | null
    if (main) main.value = ''
    if (censor) censor.value = ''
  },

  onClearCensorChange() {
    if (this.clearCensor) {
      const censor = document.getElementById('deck-edit-censor') as HTMLInputElement | null
      if (censor) censor.value = ''
    }
  },

  resetForm() {
    this.editTitle = ''
    this.editNumber = 1
    this.clearCensor = false
    this.clearFileInputs()
  },

  async onOpen(detail: OpenDeckEditDetail) {
    const deckId = detail?.deckId
    if (!deckId) return
    this.deckId = deckId
    this.deckTitle = (detail?.deckTitle ?? '').trim()
    this.open = true
    this.saveError = null
    this.loading = true
    try {
      const localRows = await listLocalCardsByDeckId(deckId)
      this.localEmpty = localRows.length === 0
      if (this.localEmpty) {
        this.cards = []
        this.selectedCardId = null
        this.resetForm()
        return
      }
      this.cards = await getCardsByDeckId(deckId)
      const firstId = this.cards[0]?.id ?? null
      this.selectCard(firstId)
    } finally {
      this.loading = false
    }
  },

  close() {
    this.open = false
    this.deckId = null
    this.deckTitle = ''
    this.cards = []
    this.localEmpty = false
    this.selectedCardId = null
    this.saveError = null
    this.resetForm()
  },

  selectCard(id: string | null) {
    if (!id) {
      this.selectedCardId = null
      this.resetForm()
      return
    }
    this.selectedCardId = id
    this.clearCensor = false
    this.clearFileInputs()
    const card = this.cards.find((c) => c.id === id)
    if (!card) return
    this.editTitle = card.title
    this.editNumber = card.num
  },

  async saveCard() {
    if (!this.deckId || !this.selectedCardId || this.localEmpty) return
    const title = this.editTitle.trim()
    if (!title) return
    const n = Number(this.editNumber)
    if (!Number.isFinite(n)) return
    this.saveError = null
    const mainInput = document.getElementById('deck-edit-main') as HTMLInputElement | null
    const censorInput = document.getElementById('deck-edit-censor') as HTMLInputElement | null
    const mainFile = mainInput?.files?.[0]
    const censorFile = censorInput?.files?.[0]
    try {
      await updateLocalCard({
        cardId: this.selectedCardId,
        title,
        number: n,
        mainImageFile: mainFile && mainFile.size > 0 ? mainFile : null,
        censorImageFile:
          this.clearCensor ? null : censorFile && censorFile.size > 0 ? censorFile : null,
        censorClear: this.clearCensor,
      })
    } catch (e) {
      this.saveError = e instanceof Error ? e.message : 'Save failed'
      return
    }
    this.clearFileInputs()
    this.clearCensor = false
    const sel = this.selectedCardId
    this.cards = await getCardsByDeckId(this.deckId)
    this.selectCard(sel)
    const activeId = Alpine.store('activeDeckId') as string
    if (activeId === this.deckId) {
      Alpine.store('shuffledCards', this.cards)
    }
  },
}))
