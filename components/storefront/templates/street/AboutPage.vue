<script setup lang="ts">
const tenant = useState<any>('tenant')
const storeSettings = useState<any>('storeSettings')
</script>

<template>
  <div class="bg-white min-h-[80vh]">
    <div class="max-w-4xl mx-auto px-6 py-24 text-center">
        <!-- Badge -->
        <span class="inline-block bg-brand border-2 border-black px-4 py-1 font-street text-xl uppercase shadow-[4px_4px_0_0_#000] rotate-2 mb-12">
            Since {{ new Date().getFullYear() }}
        </span>

        <h1 class="font-street text-7xl md:text-9xl mb-12 uppercase leading-none">
            About<br><span class="text-stroke-black text-transparent">Us</span>
        </h1>

        <div class="font-mono text-lg md:text-xl leading-relaxed text-gray-800 border-l-4 border-black pl-8 text-left space-y-8">
            <p>
                {{ storeSettings?.description || 'We don\'t just sell products. We sell a movement. Raw, unfiltered, and unapologetic. Welcome to the new standard.' }}
            </p>
            <p>
                Our mission is simple: <strong>DOMINATE.</strong>
            </p>
        </div>

        <div class="mt-24 grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
            <div class="bg-black text-white p-6 border-2 border-black shadow-[8px_8px_0_0_var(--brand)]">
                <h3 class="font-street text-3xl mb-4 text-brand">Quality</h3>
                <p class="font-mono text-xs uppercase">We use only the heaviest materials. Built to withstand the concrete jungle.</p>
            </div>
            <div class="bg-white text-black p-6 border-2 border-black shadow-[8px_8px_0_0_#000]">
                <h3 class="font-street text-3xl mb-4">Design</h3>
                <p class="font-mono text-xs uppercase">Function meets form. Brutal simplicity in every stitch.</p>
            </div>
            <div class="bg-brand text-black p-6 border-2 border-black shadow-[8px_8px_0_0_#000]">
                <h3 class="font-street text-3xl mb-4">Culture</h3>
                <p class="font-mono text-xs uppercase">More than a brand. It's a lifestyle. Join the crew.</p>
            </div>
        </div>
    </div>
    
    <!-- Big Image Area -->
    <div class="h-96 w-full bg-black border-y-4 border-black relative overflow-hidden group">
         <img src="https://placehold.co/1920x600/111/333?text=STUDIO" class="w-full h-full object-cover opacity-50 grayscale group-hover:scale-105 transition-transform duration-1000" />
         <div class="absolute inset-0 flex items-center justify-center">
             <span class="font-street text-white text-[10vw] uppercase opacity-20 group-hover:opacity-40 transition-opacity select-none">Origami</span>
         </div>
    </div>
  </div>
</template>

<style scoped>
.text-stroke-black {
    -webkit-text-stroke: 2px black;
}
</style>
