package expo.modules.tapagoandroid

import android.app.AlarmManager
import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.SystemClock
import android.view.View
import android.widget.RemoteViews
import org.json.JSONObject

/**
 * Widget da tela inicial: saldo, o resumo do dia e o timer em andamento. O app grava o estado a
 * cada mudança; o widget só desenha o último estado salvo. A contagem do timer é do sistema, e um
 * alarme simples redesenha o widget no fim, mesmo com o app fechado.
 */
class BalanceWidget : AppWidgetProvider() {
  override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) {
    refresh(context, manager, ids)
  }

  override fun onReceive(context: Context, intent: Intent) {
    super.onReceive(context, intent)
    if (intent.action == ACTION_REFRESH) refreshAll(context)
  }

  companion object {
    private const val PREFS = "tapago_widget"
    private const val KEY_STATE = "state"
    private const val ACTION_REFRESH = "expo.modules.tapagoandroid.WIDGET_REFRESH"
    private const val REQUEST_OPEN = 7310
    private const val REQUEST_REFRESH = 7311

    fun save(context: Context, state: String) {
      context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        .edit()
        .putString(KEY_STATE, state)
        .apply()
      refreshAll(context)
    }

    private fun refreshAll(context: Context) {
      val manager = AppWidgetManager.getInstance(context)
      val ids = manager.getAppWidgetIds(ComponentName(context, BalanceWidget::class.java))
      refresh(context, manager, ids)
    }

    private fun refresh(context: Context, manager: AppWidgetManager, ids: IntArray) {
      val state = readState(context)
      if (ids.isNotEmpty()) {
        val views = render(context, state)
        for (id in ids) manager.updateAppWidget(id, views)
      }
      scheduleEnd(context, if (ids.isEmpty()) null else state)
    }

    private fun readState(context: Context): JSONObject? {
      val raw = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        .getString(KEY_STATE, null) ?: return null
      return try {
        JSONObject(raw)
      } catch (error: Exception) {
        null
      }
    }

    private fun render(context: Context, state: JSONObject?): RemoteViews {
      val views = RemoteViews(context.packageName, R.layout.tapago_widget)
      views.setOnClickPendingIntent(
        R.id.tapago_widget_root,
        AppLinks.open(context, "", REQUEST_OPEN),
      )
      if (state == null || !state.optBoolean("signedIn", false)) {
        views.setTextViewText(R.id.tapago_widget_balance, "—")
        views.setTextViewText(R.id.tapago_widget_today, "Abra o app para entrar")
        views.setViewVisibility(R.id.tapago_widget_timer, View.GONE)
        return views
      }
      views.setTextViewText(R.id.tapago_widget_balance, state.optString("balance", "—"))
      views.setTextViewText(R.id.tapago_widget_today, state.optString("today", ""))

      val timer = state.optJSONObject("timer")
      if (timer == null) {
        views.setViewVisibility(R.id.tapago_widget_timer, View.GONE)
        return views
      }
      views.setViewVisibility(R.id.tapago_widget_timer, View.VISIBLE)
      views.setTextViewText(R.id.tapago_widget_timer_title, timer.optString("title", ""))
      val endsAt = timer.optLong("endsAt", 0L)
      val left = endsAt - System.currentTimeMillis()
      val paused = timer.optBoolean("paused", false)
      if (!paused && left > 0) {
        views.setViewVisibility(R.id.tapago_widget_timer_clock, View.VISIBLE)
        views.setViewVisibility(R.id.tapago_widget_timer_state, View.GONE)
        views.setChronometer(
          R.id.tapago_widget_timer_clock,
          SystemClock.elapsedRealtime() + left,
          null,
          true,
        )
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
          views.setChronometerCountDown(R.id.tapago_widget_timer_clock, true)
        }
      } else {
        views.setViewVisibility(R.id.tapago_widget_timer_clock, View.GONE)
        views.setViewVisibility(R.id.tapago_widget_timer_state, View.VISIBLE)
        views.setTextViewText(
          R.id.tapago_widget_timer_state,
          if (paused) "Pausado · ${timer.optString("pausedText", "")}" else "Tempo esgotado",
        )
      }
      return views
    }

    /** Redesenha no fim do timer, para não mostrar contagem negativa. Alarme inexato basta. */
    private fun scheduleEnd(context: Context, state: JSONObject?) {
      val alarms = context.getSystemService(AlarmManager::class.java) ?: return
      val intent = Intent(context, BalanceWidget::class.java).setAction(ACTION_REFRESH)
      val pending = PendingIntent.getBroadcast(
        context,
        REQUEST_REFRESH,
        intent,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
      )
      val timer = state?.optJSONObject("timer")
      val endsAt = timer?.optLong("endsAt", 0L) ?: 0L
      val running = timer != null && !timer.optBoolean("paused", false)
      if (running && endsAt > System.currentTimeMillis()) {
        alarms.set(AlarmManager.RTC, endsAt + 1000, pending)
      } else {
        alarms.cancel(pending)
      }
    }
  }
}
