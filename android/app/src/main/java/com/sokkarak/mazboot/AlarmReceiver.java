package com.sokkarak.mazboot;

import android.app.AlarmManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Color;
import android.media.AudioAttributes;
import android.net.Uri;
import android.os.Build;
import android.os.PowerManager;
import android.widget.RemoteViews;
import android.widget.Toast;
import androidx.core.app.NotificationCompat;

public class AlarmReceiver extends BroadcastReceiver {

    @Override
    public void onReceive(Context context, Intent intent) {
        // 1. Acquire partial WakeLock to wake the CPU if needed
        PowerManager powerManager = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
        PowerManager.WakeLock wakeLock = null;
        if (powerManager != null) {
            wakeLock = powerManager.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "SokkarakMazboot::AlarmWakeLock");
            wakeLock.acquire(10000L /* 10 seconds */);
        }

        try {
            String action = intent.getAction();
            String title = intent.getStringExtra("title");
            String body = intent.getStringExtra("body");
            String medicationId = intent.getStringExtra("medicationId");

            if (title == null || title.isEmpty()) {
                title = "تذكير بموعد الدواء السكري 💊";
            }
            if (body == null || body.isEmpty()) {
                body = "حان الآن موعد جرعتك للحفاظ على سكرك مظبوط!";
            }

            // --- STEP 3: Handle Snooze Intent Action (Silently) ---
            if ("SNOOZE_ALARM".equals(action)) {
                // Hide current notification
                int notifId = (medicationId != null) ? medicationId.hashCode() : (int) System.currentTimeMillis();
                NotificationManager notificationManager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
                if (notificationManager != null) {
                    notificationManager.cancel(notifId);
                }

                // Reschedule exact alarm 10 minutes into the future (silent exact setAlarmClock)
                long snoozeTime = System.currentTimeMillis() + (10 * 60 * 1000L); // 10 minutes
                AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
                if (alarmManager != null) {
                    Intent alarmIntent = new Intent(context, AlarmReceiver.class);
                    // Do not retain action to trigger a standard reminder when snooze alerts fire again
                    alarmIntent.putExtra("medicationId", medicationId);
                    alarmIntent.putExtra("title", title);
                    alarmIntent.putExtra("body", body);

                    String alarmKey = (medicationId != null ? medicationId : "gen") + "_" + snoozeTime;
                    int requestCode = alarmKey.hashCode();

                    int flags = PendingIntent.FLAG_UPDATE_CURRENT;
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                        flags |= PendingIntent.FLAG_IMMUTABLE;
                    }

                    PendingIntent pendingIntent = PendingIntent.getBroadcast(
                        context,
                        requestCode,
                        alarmIntent,
                        flags
                    );

                    AlarmManager.AlarmClockInfo alarmClockInfo = new AlarmManager.AlarmClockInfo(
                        snoozeTime,
                        pendingIntent
                    );

                    alarmManager.setAlarmClock(alarmClockInfo, pendingIntent);
                }

                // Native silent toast
                Toast.makeText(context, "تم تأجيل المنبّه لـ 10 دقائق ⏳", Toast.LENGTH_SHORT).show();
                return; // Early exit, no notification built
            }

            // --- Standard Notification Alert Flow ---
            String channelId = "medication_alerts";

            // Setup Custom sound URI
            int soundId = context.getResources().getIdentifier("med_ringtone", "raw", context.getPackageName());
            Uri soundUri;
            if (soundId != 0) {
                soundUri = Uri.parse("android.resource://" + context.getPackageName() + "/" + soundId);
            } else {
                soundUri = Uri.parse("android.resource://" + context.getPackageName() + "/raw/med_ringtone");
            }

            // Register Notification Channel on Oreo+
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                NotificationManager notificationManager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
                if (notificationManager != null) {
                    try {
                        notificationManager.deleteNotificationChannel(channelId);
                    } catch (Exception ignored) {}

                    NotificationChannel channel = new NotificationChannel(
                        channelId,
                        "Medication Reminders",
                        NotificationManager.IMPORTANCE_HIGH
                    );
                    channel.setDescription("Alarms scheduled via setAlarmClock");
                    channel.enableLights(true);
                    channel.setLightColor(Color.RED);
                    channel.enableVibration(true);

                    AudioAttributes audioAttributes = new AudioAttributes.Builder()
                        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                        .setUsage(AudioAttributes.USAGE_NOTIFICATION)
                        .build();
                    channel.setSound(soundUri, audioAttributes);
                    notificationManager.createNotificationChannel(channel);
                }
            }

            // Parse metadata from body or medicationId
            String medName = "دواء السكري";
            if (body != null && body.contains("\"")) {
                int firstQuote = body.indexOf("\"");
                int secondQuote = body.indexOf("\"", firstQuote + 1);
                if (firstQuote != -1 && secondQuote != -1) {
                    medName = body.substring(firstQuote + 1, secondQuote);
                }
            }

            String medDosage = "";
            if (body != null && body.contains("(") && body.contains(")")) {
                int startParen = body.indexOf("(");
                int endParen = body.indexOf(")");
                if (startParen != -1 && endParen != -1 && startParen < endParen) {
                    medDosage = body.substring(startParen + 1, endParen);
                }
            }

            String timeSlotStr = "";
            String medId = medicationId;
            if (medicationId != null && medicationId.contains("_")) {
                int lastUnderscore = medicationId.lastIndexOf("_");
                medId = medicationId.substring(0, lastUnderscore);
                timeSlotStr = medicationId.substring(lastUnderscore + 1);
            }

            String arabicTimeSlot = "";
            if ("Breakfast".equalsIgnoreCase(timeSlotStr)) {
                arabicTimeSlot = "الفطور";
            } else if ("Lunch".equalsIgnoreCase(timeSlotStr)) {
                arabicTimeSlot = "الغداء";
            } else if ("Dinner".equalsIgnoreCase(timeSlotStr)) {
                arabicTimeSlot = "العشاء";
            } else if ("Bedtime".equalsIgnoreCase(timeSlotStr)) {
                arabicTimeSlot = "النوم";
            } else {
                arabicTimeSlot = timeSlotStr;
            }

            // Build Intents to launch App on click
            Intent openAppIntent = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
            PendingIntent openAppPendingIntent = null;
            if (openAppIntent != null) {
                openAppIntent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
                int flags = PendingIntent.FLAG_UPDATE_CURRENT;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    flags |= PendingIntent.FLAG_IMMUTABLE;
                }
                openAppPendingIntent = PendingIntent.getActivity(context, 0, openAppIntent, flags);
            }

            // Full-Screen Intent pointing to MainActivity
            Intent fullScreenIntent = new Intent(context, MainActivity.class);
            fullScreenIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);
            int fsFlags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                fsFlags |= PendingIntent.FLAG_IMMUTABLE;
            }
            PendingIntent fullScreenPendingIntent = PendingIntent.getActivity(context, 0, fullScreenIntent, fsFlags);

            // --- STEP 1 & 2: Custom RemoteViews Layout and Icons ---
            int layoutId = context.getResources().getIdentifier("custom_notification", "layout", context.getPackageName());
            RemoteViews customView = new RemoteViews(context.getPackageName(), layoutId);

            int titleId = context.getResources().getIdentifier("notification_title", "id", context.getPackageName());
            int timeslotId = context.getResources().getIdentifier("notification_timeslot", "id", context.getPackageName());
            int bodyId = context.getResources().getIdentifier("notification_body", "id", context.getPackageName());

            customView.setTextViewText(titleId, medName + (medDosage.isEmpty() ? "" : " - " + medDosage));
            customView.setTextViewText(timeslotId, arabicTimeSlot.isEmpty() ? "تذكير" : arabicTimeSlot);
            customView.setTextViewText(bodyId, body);

            int appIconId = context.getResources().getIdentifier("ic_launcher", "mipmap", context.getPackageName());
            if (appIconId == 0) {
                appIconId = android.R.drawable.ic_lock_idle_alarm;
            }

            // Set large icon using BitmapFactory decoding launcher
            Bitmap largeIcon = null;
            try {
                largeIcon = BitmapFactory.decodeResource(context.getResources(), appIconId);
            } catch (Exception ignored) {}

            NotificationCompat.Builder builder = new NotificationCompat.Builder(context, channelId)
                .setSmallIcon(appIconId)
                .setPriority(NotificationCompat.PRIORITY_MAX)
                .setCategory(NotificationCompat.CATEGORY_ALARM)
                .setFullScreenIntent(fullScreenPendingIntent, true)
                .setAutoCancel(true)
                .setSound(soundUri)
                .setVibrate(new long[]{0, 1000, 500, 1000})
                .setStyle(new NotificationCompat.DecoratedCustomViewStyle())
                .setCustomContentView(customView);

            if (largeIcon != null) {
                builder.setLargeIcon(largeIcon);
            }

            if (openAppPendingIntent != null) {
                builder.setContentIntent(openAppPendingIntent);
            }

            // --- STEP 3: Action Button: Snooze (تذكيري بعد 10 دقائق ⏳) ---
            Intent snoozeActionIntent = new Intent(context, AlarmReceiver.class);
            snoozeActionIntent.setAction("SNOOZE_ALARM");
            snoozeActionIntent.putExtra("medicationId", medicationId);
            snoozeActionIntent.putExtra("title", title);
            snoozeActionIntent.putExtra("body", body);

            int snoozeFlags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                snoozeFlags |= PendingIntent.FLAG_IMMUTABLE;
            }
            PendingIntent snoozePendingIntent = PendingIntent.getBroadcast(
                context,
                (medicationId != null ? medicationId.hashCode() + 1 : 1234),
                snoozeActionIntent,
                snoozeFlags
            );
            builder.addAction(0, "تذكيري بعد 10 دقائق ⏳", snoozePendingIntent);

            // --- STEP 4: Action Button: Take Medication (أخذت الدواء ✅) ---
            Intent takeMedIntent = new Intent(context, MainActivity.class);
            takeMedIntent.setAction("TAKE_MEDICATION");
            takeMedIntent.putExtra("medicationId", medId);
            takeMedIntent.putExtra("timeSlot", timeSlotStr);
            takeMedIntent.putExtra("medicationName", medName);
            takeMedIntent.putExtra("dosage", medDosage);
            takeMedIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP);

            int takeFlags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                takeFlags |= PendingIntent.FLAG_MUTABLE; // Must be mutable for onNewIntent in Android 12+
            }
            PendingIntent takePendingIntent = PendingIntent.getActivity(
                context,
                (medicationId != null ? medicationId.hashCode() + 2 : 5678),
                takeMedIntent,
                takeFlags
            );
            builder.addAction(0, "أخذت الدواء ✅", takePendingIntent);

            // Fire Notification
            NotificationManager notificationManager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            int notifId = (medicationId != null) ? medicationId.hashCode() : (int) System.currentTimeMillis();
            if (notificationManager != null) {
                notificationManager.notify(notifId, builder.build());
            }

        } finally {
            if (wakeLock != null && wakeLock.isHeld()) {
                wakeLock.release();
            }
        }
    }
}
