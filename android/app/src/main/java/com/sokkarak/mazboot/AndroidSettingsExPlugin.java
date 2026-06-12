package com.sokkarak.mazboot;

import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.PowerManager;
import android.provider.Settings;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.PermissionState;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import java.util.ArrayList;

@CapacitorPlugin(
    name = "AndroidSettingsEx",
    permissions = {
        @Permission(
            alias = "microphone",
            strings = { android.Manifest.permission.RECORD_AUDIO }
        )
    }
)
public class AndroidSettingsExPlugin extends Plugin {

    private SpeechRecognizer speechRecognizer = null;
    private Intent speechIntent = null;

    @PluginMethod
    public void isBatteryOptimizationIgnored(PluginCall call) {
        JSObject ret = new JSObject();
        try {
            Context context = getContext();
            PowerManager pm = (PowerManager) context.getSystemService(Context.POWER_SERVICE);
            boolean isIgnored = true;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                isIgnored = pm.isIgnoringBatteryOptimizations(context.getPackageName());
            }
            ret.put("ignored", isIgnored);
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Error checking battery optimization", e);
        }
    }

    @PluginMethod
    public void requestIgnoreBatteryOptimization(PluginCall call) {
        try {
            Context context = getContext();
            Intent intent = new Intent();
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                intent.setAction(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
                intent.setData(Uri.parse("package:" + context.getPackageName()));
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(intent);
            }
            call.resolve();
        } catch (Exception e) {
            call.reject("Error requesting battery optimization exemption", e);
        }
    }

    @PluginMethod
    public void checkMicrophonePermission(PluginCall call) {
        JSObject ret = new JSObject();
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                boolean granted = getPermissionState("microphone") == PermissionState.GRANTED;
                ret.put("granted", granted);
            } else {
                ret.put("granted", true);
            }
            call.resolve(ret);
        } catch (Exception e) {
            ret.put("granted", false);
            call.resolve(ret);
        }
    }

    @PluginMethod
    public void requestMicrophonePermission(PluginCall call) {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                if (getPermissionState("microphone") != PermissionState.GRANTED) {
                    requestPermissionForAlias("microphone", call, "microphoneCallback");
                } else {
                    JSObject ret = new JSObject();
                    ret.put("granted", true);
                    call.resolve(ret);
                }
            } else {
                JSObject ret = new JSObject();
                ret.put("granted", true);
                call.resolve(ret);
            }
        } catch (Exception e) {
            call.reject("Error requesting permission", e);
        }
    }

    @PermissionCallback
    private void microphoneCallback(PluginCall call) {
        JSObject ret = new JSObject();
        boolean granted = getPermissionState("microphone") == PermissionState.GRANTED;
        ret.put("granted", granted);
        call.resolve(ret);
    }

    @PluginMethod
    public void startSpeechRecognition(final PluginCall call) {
        getBridge().getActivity().runOnUiThread(new Runnable() {
            @Override
            public void run() {
                try {
                    if (speechRecognizer != null) {
                        try {
                            speechRecognizer.destroy();
                        } catch (Exception e) {}
                        speechRecognizer = null;
                    }

                    speechRecognizer = SpeechRecognizer.createSpeechRecognizer(getContext());
                    speechIntent = new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
                    speechIntent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
                    
                    String lang = call.getString("language", "ar");
                    speechIntent.putExtra(RecognizerIntent.EXTRA_LANGUAGE, lang);
                    speechIntent.putExtra(RecognizerIntent.EXTRA_LANGUAGE_PREFERENCE, lang);
                    speechIntent.putExtra(RecognizerIntent.EXTRA_ONLY_RETURN_LANGUAGE_PREFERENCE, lang);
                    speechIntent.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true);

                    speechRecognizer.setRecognitionListener(new RecognitionListener() {
                        @Override
                        public void onReadyForSpeech(Bundle params) {
                            JSObject ret = new JSObject();
                            ret.put("status", "ready");
                            notifyListeners("speechStatus", ret);
                        }

                        @Override
                        public void onBeginningOfSpeech() {
                            JSObject ret = new JSObject();
                            ret.put("status", "listening");
                            notifyListeners("speechStatus", ret);
                        }

                        @Override
                        public void onRmsChanged(float rmsdB) {}

                        @Override
                        public void onBufferReceived(byte[] buffer) {}

                        @Override
                        public void onEndOfSpeech() {
                            JSObject ret = new JSObject();
                            ret.put("status", "stopped");
                            notifyListeners("speechStatus", ret);
                        }

                        @Override
                        public void onError(int error) {
                            JSObject ret = new JSObject();
                            ret.put("error", error);
                            String errMsg = "unknown";
                            if (error == SpeechRecognizer.ERROR_NO_MATCH) {
                                errMsg = "no-speech";
                            } else if (error == SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS) {
                                errMsg = "not-allowed";
                            } else if (error == SpeechRecognizer.ERROR_NETWORK || error == SpeechRecognizer.ERROR_NETWORK_TIMEOUT) {
                                errMsg = "network";
                            }
                            ret.put("msg", errMsg);
                            notifyListeners("speechError", ret);
                        }

                        @Override
                        public void onResults(Bundle results) {
                            ArrayList<String> matches = results.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
                            if (matches != null && !matches.isEmpty()) {
                                JSObject ret = new JSObject();
                                ret.put("text", matches.get(0));
                                ret.put("isFinal", true);
                                notifyListeners("speechResult", ret);
                            }
                        }

                        @Override
                        public void onPartialResults(Bundle partialResults) {
                            ArrayList<String> matches = partialResults.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
                            if (matches != null && !matches.isEmpty()) {
                                JSObject ret = new JSObject();
                                ret.put("text", matches.get(0));
                                ret.put("isFinal", false);
                                notifyListeners("speechResult", ret);
                            }
                        }

                        @Override
                        public void onEvent(int eventType, Bundle params) {}
                    });

                    speechRecognizer.startListening(speechIntent);
                    call.resolve();
                } catch (Exception e) {
                    call.reject("Failed to initialize native speech recognizer: " + e.getMessage(), e);
                }
            }
        });
    }

    @PluginMethod
    public void stopSpeechRecognition(final PluginCall call) {
        getBridge().getActivity().runOnUiThread(new Runnable() {
            @Override
            public void run() {
                try {
                    if (speechRecognizer != null) {
                        try {
                            speechRecognizer.stopListening();
                        } catch (Exception e) {}
                    }
                    JSObject ret = new JSObject();
                    ret.put("stopped", true);
                    call.resolve(ret);
                } catch (Exception e) {
                    call.reject("Failed to stop speech recognition: " + e.getMessage(), e);
                }
            }
        });
    }
}
