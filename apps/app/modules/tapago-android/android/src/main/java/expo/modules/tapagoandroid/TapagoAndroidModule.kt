package expo.modules.tapagoandroid

import android.content.Context
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/** Ponte do app para a notificação fixa do timer (NOTIF-05) e para o widget da tela inicial. */
class TapagoAndroidModule : Module() {
  private val context: Context
    get() = requireNotNull(appContext.reactContext) { "Sem contexto do app." }.applicationContext

  override fun definition() = ModuleDefinition {
    Name("TapagoAndroid")

    Function("showTimer") { title: String, endsAt: Double, paused: Boolean, pausedText: String ->
      TimerNotification.show(context, title, endsAt.toLong(), paused, pausedText)
    }

    Function("hideTimer") {
      TimerNotification.hide(context)
    }

    Function("updateWidget") { state: String ->
      BalanceWidget.save(context, state)
    }
  }
}
