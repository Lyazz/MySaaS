const fs = require('fs');
const path = require('path');

const templatesDir = path.join(__dirname, 'components/storefront/templates');
const templates = ['activewear', 'classic', 'cozy', 'cyber', 'food', 'minimal', 'modern', 'playful', 'stationnery', 'street', 'wellness'];

const newCountdownStr = `
      <!-- Countdown Overlay -->
      <div v-if="product.showCountdown && product.promotionEndDate && isPromoValid" class="absolute bottom-0 inset-x-0 z-20 flex justify-center bg-gradient-to-t from-black/60 via-black/20 to-transparent pt-8 pb-3 pointer-events-none">
        <div class="scale-[0.85] sm:scale-90 origin-bottom">
          <StorefrontSharedCountdownTimer
            :end-date="product.promotionEndDate"
            theme="danger"
            :show-icon="true"
          />
        </div>
      </div>
`;

for (const tpl of templates) {
    const cardPath = path.join(templatesDir, tpl, 'ProductCard.vue');
    if (fs.existsSync(cardPath)) {
        let content = fs.readFileSync(cardPath, 'utf-8');

        // Remove existing countdown
        content = content.replace(/\s*<!-- Countdown -->[\s\S]*?<\/StorefrontSharedCountdownTimer>\s*<\/div>/, '');

        if (!content.includes('<!-- Countdown Overlay -->')) {
            const parts = content.split('<!-- Details -->');
            if (parts.length > 1) {
                let before = parts[0];
                const lastDivIndex = before.lastIndexOf('</div>');
                if (lastDivIndex !== -1) {
                    before = before.substring(0, lastDivIndex) + newCountdownStr + '    ' + before.substring(lastDivIndex);
                    content = before + '<!-- Details -->' + parts[1];

                    fs.writeFileSync(cardPath, content, 'utf-8');
                    console.log('Moved countdown to overlay in ' + cardPath);
                } else {
                    console.log('Could not find last div before Details in ' + tpl);
                }
            } else {
                console.log('Could not find <!-- Details --> in ' + tpl);
            }
        }
    }
}
