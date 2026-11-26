package expo.modules.tapagoandroid

import android.Manifest
import android.annotation.SuppressLint
import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import java.util.Date

/**
 * O timer do lazer na notificação fixa (NOTIF-05). A contagem regressiva é do próprio sistema
 * (cronômetro da notificação), então segue certa com o app fechado. Some sozinha no fim.
 */
internal object TimerNotification {
  private const val CHANNEL_ID = "timer-ongoing"
  private const val NOTIFICATION_ID = 7301

  private fun ensureChannel(context: Context) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
    val manager = context.getSystemService(NotificationManager::class.java) ?: return
    if (manager.getNotificationChannel(CHANNEL_ID) != null) return
    val channel = NotificationChannel(
      CHANNEL_ID,
      "Timer em andamento",
      NotificationManager.IMPORTANCE_LOW,
    ).apply {
      description = "Mostra o lazer em andamento e quanto falta"
      setShowBadge(false)
    }
    manager.createNotificationChannel(channel)
  }

  private fun canNotify(context: Context): Boolean {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
      ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) !=
      PackageManager.PERMISSION_GRANTED
    ) {
      return false
    }
    return NotificationManagerCompat.from(context).areNotificationsEnabled()
  }

  @SuppressLint("MissingPermission")
  fun show(context: Context, title: String, endsAt: Long, paused: Boolean, pausedText: String) {
    if (!canNotify(context)) return
    val now = System.currentTimeMillis()
    if (!paused && endsAt <= now) {
      hide(context)
      return
    }
    ensureChannel(context)
    val builder = NotificationCompat.Builder(context, CHANNEL_ID)
      .setSmallIcon(R.drawable.tapago_stat_timer)
      .setContentTitle(title)
      .setOngoing(true)
      .setOnlyAlertOnce(true)
      .setSilent(true)
      .setCategory(NotificationCompat.CATEGORY_STOPWATCH)
      .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
      .setContentIntent(AppLinks.open(context, "inventory", NOTIFICATION_ID))
    if (paused) {
      builder.setContentText("Pausado · $pausedText").setShowWhen(false)
    } else {
      val clock = android.text.format.DateFormat.getTimeFormat(context).format(Date(endsAt))
      builder
        .setContentText("Tá pago · termina às $clock")
        .setWhen(endsAt)
        .setShowWhen(true)
        .setUsesChronometer(true)
        .setChronometerCountDown(true)
        .setTimeoutAfter(endsAt - now)
    }
    try {
      NotificationManagerCompat.from(context).notify(NOTIFICATION_ID, builder.build())
    } catch (error: SecurityException) {
      // Permissão retirada entre a checagem e o aviso: sem notificação fixa, o app segue.
    }
  }

  fun hide(context: Context) {
    NotificationManagerCompat.from(context).cancel(NOTIFICATION_ID)
  }
}
