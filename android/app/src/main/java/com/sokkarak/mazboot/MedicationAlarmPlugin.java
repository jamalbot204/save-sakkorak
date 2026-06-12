package com.sokkarak.mazboot;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.Uri;
import android.os.Build;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.HashSet;
import java.util.Set;

@CapacitorPlugin(name = "MedicationAlarm")
public class MedicationAlarmPlugin extends Plugin {

    @PluginMethod
    public void scheduleExactAlarm(PluginCall call) {
        try {
            Long timestamp = call.getLong("timestamp");
            String medicationId = call.getString("medicationId");
            String title = call.getString("title");
            String body = call.getString("body");

            if (timestamp == null) {
                call.reject("Timestamp is required to set exact alarm");
                return;
            }

            Context context = getContext();
            AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            if (alarmManager == null) {
                call.reject("AlarmManager service not available");
                return;
            }

            // Create Intent to point to our BroadcastReceiver
            Intent intent = new Intent(context, AlarmReceiver.class);
            intent.putExtra("medicationId", medicationId);
            intent.putExtra("title", title);
            intent.putExtra("body", body);

            // Create a unique stable requestCode for each medication / timestamp combination
            String alarmKey = (medicationId != null ? medicationId : "gen") + "_" + timestamp;
            int requestCode = alarmKey.hashCode();

            // Setup PendingIntent flags correctly across different Android API versions
            int flags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                flags |= PendingIntent.FLAG_IMMUTABLE;
            }

            PendingIntent pendingIntent = PendingIntent.getBroadcast(
                context,
                requestCode,
                intent,
                flags
            );

            // Use setAlarmClock to achieve exact, second-perfect wake alarms that bypass Doze mode completely
            AlarmManager.AlarmClockInfo alarmClockInfo = new AlarmManager.AlarmClockInfo(
                timestamp,
                pendingIntent
            );

            alarmManager.setAlarmClock(alarmClockInfo, pendingIntent);

            // Persist the alarm details to SharedPreferences for post-boot recovery
            try {
                SharedPreferences prefs = context.getSharedPreferences("mazboot_alarms", Context.MODE_PRIVATE);
                Set<String> allAlarmKeys = new HashSet<>(prefs.getStringSet("all_alarm_keys", new HashSet<String>()));
                allAlarmKeys.add(alarmKey);
                
                SharedPreferences.Editor editor = prefs.edit();
                editor.putStringSet("all_alarm_keys", allAlarmKeys);
                editor.putLong("timestamp_" + alarmKey, timestamp);
                editor.putString("medicationId_" + alarmKey, medicationId);
                editor.putString("title_" + alarmKey, title);
                editor.putString("body_" + alarmKey, body);
                editor.apply();
            } catch (Exception e) {
                e.printStackTrace();
            }

            JSObject ret = new JSObject();
            ret.put("success", true);
            ret.put("requestCode", requestCode);
            call.resolve(ret);

        } catch (SecurityException se) {
            call.reject("SecurityException setting exact alarm: exact alarm permission might be revoked by OS settings.", se);
        } catch (Exception e) {
            call.reject("Error scheduling exact alarm: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void cancelExactAlarm(PluginCall call) {
        // Provide helper method to cancel a scheduled exact alarm if needed
        try {
            Long timestamp = call.getLong("timestamp");
            String medicationId = call.getString("medicationId");

            if (timestamp == null) {
                call.reject("Timestamp is required to cancel exact alarm");
                return;
            }

            Context context = getContext();
            AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            if (alarmManager == null) {
                call.reject("AlarmManager service not available");
                return;
            }

            Intent intent = new Intent(context, AlarmReceiver.class);
            String alarmKey = (medicationId != null ? medicationId : "gen") + "_" + timestamp;
            int requestCode = alarmKey.hashCode();

            int flags = PendingIntent.FLAG_UPDATE_CURRENT;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                flags |= PendingIntent.FLAG_IMMUTABLE;
            }

            PendingIntent pendingIntent = PendingIntent.getBroadcast(
                context,
                requestCode,
                intent,
                flags
            );

            alarmManager.cancel(pendingIntent);
            pendingIntent.cancel();

            // Remove persistent copy of the alarm details
            try {
                SharedPreferences prefs = context.getSharedPreferences("mazboot_alarms", Context.MODE_PRIVATE);
                Set<String> allAlarmKeys = new HashSet<>(prefs.getStringSet("all_alarm_keys", new HashSet<String>()));
                if (allAlarmKeys.contains(alarmKey)) {
                    allAlarmKeys.remove(alarmKey);
                    SharedPreferences.Editor editor = prefs.edit();
                    editor.putStringSet("all_alarm_keys", allAlarmKeys);
                    editor.remove("timestamp_" + alarmKey);
                    editor.remove("medicationId_" + alarmKey);
                    editor.remove("title_" + alarmKey);
                    editor.remove("body_" + alarmKey);
                    editor.apply();
                }
            } catch (Exception e) {
                e.printStackTrace();
            }

            JSObject ret = new JSObject();
            ret.put("success", true);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Error canceling exact alarm: " + e.getMessage(), e);
        }
    }

    @PluginMethod
    public void canScheduleExactAlarms(PluginCall call) {
        JSObject ret = new JSObject();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            Context context = getContext();
            AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            if (alarmManager != null) {
                ret.put("granted", alarmManager.canScheduleExactAlarms());
                call.resolve(ret);
                return;
            }
        }
        ret.put("granted", true);
        call.resolve(ret);
    }

    @PluginMethod
    public void requestExactAlarmPermission(PluginCall call) {
        JSObject ret = new JSObject();
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            Context context = getContext();
            AlarmManager alarmManager = (AlarmManager) context.getSystemService(Context.ALARM_SERVICE);
            if (alarmManager != null && !alarmManager.canScheduleExactAlarms()) {
                Intent intent = new Intent(android.provider.Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM);
                intent.setData(Uri.parse("package:" + context.getPackageName()));
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(intent);
                ret.put("opened", true);
                call.resolve(ret);
                return;
            }
        }
        ret.put("opened", false);
        call.resolve(ret);
    }

    @PluginMethod
    public void getLaunchIntentAction(PluginCall call) {
        try {
            android.app.Activity activity = getActivity();
            if (activity == null) {
                call.reject("Activity is not available");
                return;
            }
            Intent intent = activity.getIntent();
            JSObject ret = new JSObject();
            if (intent != null && "TAKE_MEDICATION".equals(intent.getAction())) {
                String medicationId = intent.getStringExtra("medicationId");
                String timeSlot = intent.getStringExtra("timeSlot");
                String medicationName = intent.getStringExtra("medicationName");
                String dosage = intent.getStringExtra("dosage");

                ret.put("isTakeAction", true);
                ret.put("medicationId", medicationId);
                ret.put("timeSlot", timeSlot);
                ret.put("medicationName", medicationName);
                ret.put("dosage", dosage);

                // Clear action so we don't process it again on subsequent queries or app launches
                intent.setAction(null);
                activity.setIntent(intent);
            } else {
                ret.put("isTakeAction", false);
            }
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Error reading launch intent action: " + e.getMessage(), e);
        }
    }
}
