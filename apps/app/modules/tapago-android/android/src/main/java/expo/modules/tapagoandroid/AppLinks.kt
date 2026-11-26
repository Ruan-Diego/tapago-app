package expo.modules.tapagoandroid

import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.net.Uri

/** Abrir o app numa tela, pelo esquema `tapago://` que o Expo Router entende. */
internal object AppLinks {
  fun open(context: Context, path: String, requestCode: Int): PendingIntent {
    val intent = Intent(Intent.ACTION_VIEW, Uri.parse("tapago://$path"))
      .setPackage(context.packageName)
      .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP)
    return PendingIntent.getActivity(
      context,
      requestCode,
      intent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
  }
}
