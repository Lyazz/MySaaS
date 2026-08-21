<script setup lang="ts">
const storefrontContent = useStorefrontContent()

const form = reactive({
  name: '',
  email: '',
  message: ''
})

const submitForm = () => {
  alert('Votre message a été envoyé. Nous vous répondrons dans les plus brefs délais.')
}
</script>

<template>
  <div class="contact">
    <!-- Page header -->
    <div class="contact__header">
      <div class="contact__header-inner">
        <span class="at-label">Nous contacter</span>
        <h1 class="contact__title">{{ storefrontContent.nav.contact }}</h1>
      </div>
    </div>

    <div class="contact__body">
      <!-- Info panel -->
      <aside class="contact__info">
        <div class="contact__info-rule" />
        <div>
          <h2 class="contact__info-title">Prenons<br><em>contact</em></h2>
          <p class="contact__info-desc">
            Vous avez une question sur un produit, une commande ou vous souhaitez simplement nous dire bonjour ? Nous sommes là pour vous.
          </p>

          <div class="contact__info-items">
            <div class="contact__info-item">
              <div class="contact__info-icon">
                <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                  <path d="M7 13S2 9.5 2 5.5a5 5 0 0110 0C12 9.5 7 13 7 13z" stroke="currentColor" stroke-width="0.75"/>
                  <circle cx="7" cy="5.5" r="1.5" stroke="currentColor" stroke-width="0.75"/>
                </svg>
              </div>
              <span>Algérie</span>
            </div>
          </div>

          <p class="contact__info-tagline">Pistachio — Art de vivre</p>
        </div>
      </aside>

      <!-- Form panel -->
      <div class="contact__form-panel">
        <form class="contact__form" @submit.prevent="submitForm">
          <div class="contact__field">
            <label class="contact__label">Nom complet</label>
            <input
              v-model="form.name"
              type="text"
              placeholder="Votre nom"
              class="at-input"
            >
          </div>

          <div class="contact__field">
            <label class="contact__label">Email</label>
            <input
              v-model="form.email"
              type="email"
              placeholder="votre@email.com"
              class="at-input"
            >
          </div>

          <div class="contact__field">
            <label class="contact__label">Message</label>
            <textarea
              v-model="form.message"
              rows="6"
              placeholder="Votre message…"
              class="at-input contact__textarea"
            />
          </div>

          <button type="submit" class="at-btn-solid">
            Envoyer le message
            <svg width="14" height="8" viewBox="0 0 14 8" fill="none">
              <path d="M1 4h12M8 1l5 3-5 3" stroke="currentColor" stroke-width="0.85"/>
            </svg>
          </button>
        </form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.contact { min-height: 80vh; }

/* Header */
.contact__header {
  border-bottom: 1px solid var(--at-border);
  background: var(--at-grad-shell);
  padding: clamp(48px, 8vw, 96px) clamp(20px, 6vw, 96px) clamp(32px, 5vw, 56px);
  border-end-end-radius: clamp(40px, 7vw, 110px);
}
.contact__header-inner { max-width: 1400px; margin: 0 auto; }
.contact__title {
  font-family: var(--at-f-display);
  font-size: clamp(3rem, 7vw, 7rem);
  font-weight: 600;
  letter-spacing: -0.035em;
  line-height: 1.0;
  color: var(--at-cream);
  margin-top: 10px;
}

/* Body */
.contact__body {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 clamp(20px, 6vw, 96px);
  display: grid;
  grid-template-columns: 1fr;
  gap: 1px;
  background: var(--at-border);
  border: 1px solid var(--at-border);
  border-radius: var(--at-r-lg);
  box-shadow: var(--at-shadow-md);
  overflow: hidden;
  margin-top: clamp(32px, 5vw, 56px);
  margin-bottom: clamp(32px, 5vw, 56px);
}
@media (min-width: 768px) {
  .contact__body { grid-template-columns: 1fr 1.4fr; }
}

/* Info panel */
.contact__info {
  background: var(--at-surface);
  padding: clamp(40px, 6vw, 72px) clamp(24px, 4vw, 56px);
  display: flex;
  align-items: flex-start;
  gap: 28px;
}
.contact__info-rule {
  width: 2px;
  flex-shrink: 0;
  border-radius: 2px;
  background: linear-gradient(to bottom, var(--at-gold), transparent);
  align-self: stretch;
  min-height: 80px;
}
.contact__info-title {
  font-family: var(--at-f-display);
  font-size: clamp(2rem, 4vw, 3.5rem);
  font-weight: 600;
  letter-spacing: -0.028em;
  line-height: 1.05;
  color: var(--at-cream);
  margin-bottom: 20px;
}
.contact__info-title em {
  font-style: italic;
  font-weight: 400;
  color: var(--at-gold);
}
.contact__info-desc {
  font-family: var(--at-f-mono);
  font-size: 12px;
  font-weight: 300;
  line-height: 1.9;
  color: var(--at-sub);
  max-width: 300px;
  margin-bottom: 32px;
}
.contact__info-items {
  display: flex;
  flex-direction: column;
  gap: 14px;
  margin-bottom: 40px;
}
.contact__info-item {
  display: flex;
  align-items: center;
  gap: 12px;
  font-family: var(--at-f-mono);
  font-size: 12px;
  font-weight: 300;
  color: var(--at-sub);
}
.contact__info-icon {
  width: 30px;
  height: 30px;
  background: var(--at-grad-green);
  border-radius: var(--at-r-pill);
  box-shadow: var(--at-shadow-xs);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #FFFBF0;
  flex-shrink: 0;
}
.contact__info-tagline {
  font-family: var(--at-f-mono);
  font-size: 8px;
  letter-spacing: 0;
  text-transform: uppercase;
  color: var(--at-muted);
}

/* Form panel */
.contact__form-panel {
  background: var(--at-grad-paper);
  padding: clamp(40px, 6vw, 72px) clamp(24px, 4vw, 56px);
}
.contact__form {
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 560px;
}
.contact__field { display: flex; flex-direction: column; gap: 8px; }
.contact__label {
  font-family: var(--at-f-mono);
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--at-sub);
}
.contact__textarea {
  resize: none;
  height: 140px;
}
</style>
