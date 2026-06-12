package com.sokkarak.mazboot;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import java.util.HashSet;
import java.util.Set;

public class BootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent.getAction();
        if (Intent.ACTION_BOOT_COMPLETED.equals(action) ||
            "android.intent.action.LOCKED_BOOT_COMPLETED".equals(action) ||
            "android.intent.action.QUICKBOOT_POWERON".equals(action)) {
            
            SharedPreferences prefs = context.getSharedPreferences("mazboot_alarms", Context.MODE_PRIVATE);
            Set<String> allAlarmKeys = prefs.getStringSet("all_alarm_keys", null);
            if (allAlarmKeys == null || allAlarmKeys.isEmpty()) {
                return;
            }

            AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            if (alarmManager == null) {
                return;
            }

            long now = System.currentTimeMillis();
            Set<String> keysToRemove = new HashSet<>();
            
            // Loop through each alarm key and reschedule if in the future
            for (String alarmKey : allAlarmKeys) {
                long timestamp = prefs.getLong("timestamp_" + alarmKey, 0L);
                String medicationId = prefs.getString("medicationId_" + alarmKey, null);
                String title = prefs.getString("title_" + alarmKey, null);
                String body = prefs.getString("body_" + alarmKey, null);

                if (timestamp > now) {
                    Intent alarmIntent = new Intent(context, AlarmReceiver.class);
                    alarmIntent.putExtra("medicationId", medicationId);
                    alarmIntent.putExtra("title", title);
                    alarmIntent.putExtra("body", body);

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
                        timestamp,
                        pendingIntent
                    );

                    try {
                        alarmManager.setAlarmClock(alarmClockInfo, pendingIntent);
                    } catch (Exception e) {
                        e.printStackTrace();
                    }
                } else {
                    // Mark expired alarms for removal from preferences
                    keysToRemove.add(alarmKey);
                }
            }

            // Cleanup expired alarms from SharedPreferences
            if (!keysToRemove.isEmpty()) {
                Set<String> updatedKeys = new java.util.HashSet<>(allAlarmKeys);
                updatedKeys.removeAll(keysToRemove);
                
                SharedPreferences.Editor editor = prefs.edit();
                editor.putStringSet("all_alarm_keys", updatedKeys);
                for (String key : keysToRemove) {
                    editor.remove("timestamp_" + key);
                    editor.remove("medicationId_" + key);
                    editor.remove("title_" + key);
                    editor.remove("body_" + key);
                }
                editor.apply();
            }
        }
    }
}
