/**
 * Cross-platform dialogs.
 *
 * React Native's Alert.alert is a no-op on react-native-web, so confirmations
 * (sign out, withdraw, report, unmatch) silently did nothing in the PWA. This
 * wrapper keeps the native Alert on iOS/Android and uses window.confirm /
 * window.alert on web.
 */

import { Alert, Platform, type AlertButton, type AlertOptions } from 'react-native';

type DialogButton = AlertButton;

export function showDialog(
  title: string,
  message?: string,
  buttons?: DialogButton[],
  options?: AlertOptions
) {
  if (Platform.OS !== 'web') {
    Alert.alert(title, message, buttons, options);
    return;
  }

  const text = message ? `${title}\n\n${message}` : title;

  // Single button (or none): plain information
  if (!buttons || buttons.length <= 1) {
    if (typeof window !== 'undefined') window.alert(text);
    return;
  }

  // Confirmations: run the non-cancel action when the user accepts
  const cancellable = buttons.some((button) => button.style === 'cancel');
  const action =
    buttons.find((button) => button.style !== 'cancel' && button.style !== 'destructive') ??
    buttons.find((button) => button.style !== 'cancel');

  const accepted = typeof window !== 'undefined' ? window.confirm(text) : true;

  if (accepted) {
    action?.onPress?.();
  } else if (cancellable) {
    buttons.find((button) => button.style === 'cancel')?.onPress?.();
  }
}
