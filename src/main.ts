import { createApp } from "vue"
import "./style.css"

async function bootstrap() {
  let RootComponent

  switch (new URLSearchParams(window.location.search).get("view")) {
    case "email-change":
      const { default: EmailChangeResultPage } = await import("./EmailChangeResultPage.vue")
      RootComponent = EmailChangeResultPage
      break

    default:
      const { default: App } = await import("./App.vue")
      RootComponent = App
      break
  }

  createApp(RootComponent).mount("#app")
}

void bootstrap()
