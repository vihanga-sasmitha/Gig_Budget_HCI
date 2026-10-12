import { File, Paths } from 'expo-file-system';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import { Platform } from 'react-native';

/** Ensure a local filesystem URI Sharing / Print can open. */
export function normalizeFileUri(uri) {
  if (!uri) return uri;
  if (
    uri.startsWith('file://') ||
    uri.startsWith('content://') ||
    uri.startsWith('data:')
  ) {
    return uri;
  }
  if (uri.startsWith('/')) return `file://${uri}`;
  return `file://${uri}`;
}

/**
 * Build a PDF in app cache that Sharing can always read.
 * Prefer base64 from expo-print written via legacy FileSystem (reliable on Android/Expo Go).
 */
export async function createShareablePdfFromHtml(html) {
  const printed = await Print.printToFileAsync({
    html,
    base64: true,
  });

  const destName = `gigbudget-report-${Date.now()}.pdf`;
  const legacyDest = `${FileSystem.cacheDirectory}${destName}`;

  if (printed?.base64) {
    await FileSystem.writeAsStringAsync(legacyDest, printed.base64, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return legacyDest;
  }

  const from = normalizeFileUri(printed?.uri);
  if (!from) {
    throw new Error('PDF generation returned no file data.');
  }

  try {
    await FileSystem.copyAsync({ from, to: legacyDest });
    return legacyDest;
  } catch {
    // New File API fallback
    const dest = new File(Paths.cache, destName);
    if (dest.exists) dest.delete();
    try {
      await new File(from).copy(dest);
      return dest.uri;
    } catch (e) {
      throw new Error(
        `Could not save PDF for sharing (${e?.message || 'unknown'}). Try Export CSV instead.`
      );
    }
  }
}

export async function shareLocalFile(uri, options) {
  if (!(await Sharing.isAvailableAsync())) {
    return { shared: false, uri, reason: 'unavailable' };
  }
  const shareUri = normalizeFileUri(uri);
  try {
    await Sharing.shareAsync(shareUri, options);
    return { shared: true, uri: shareUri };
  } catch {
    await Sharing.shareAsync(uri, options);
    return { shared: true, uri };
  }
}

export async function sharePdfUri(uri) {
  return shareLocalFile(uri, {
    mimeType: 'application/pdf',
    dialogTitle: 'GigBudget report PDF',
    UTI: 'com.adobe.pdf',
  });
}

function withTimeout(promise, ms, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`${label} timed out after ${ms / 1000}s`)),
      ms
    );
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/**
 * Open the system print UI. Prefer printing a PDF file URI (more reliable than
 * large HTML WebView on Android / Expo Go). Falls back to share sheet.
 */
export async function printOrSharePdf(html) {
  const pdfUri = await createShareablePdfFromHtml(html);

  try {
    await withTimeout(
      Print.printAsync({ uri: pdfUri }),
      Platform.OS === 'android' ? 20000 : 60000,
      'Print preview'
    );
    return { mode: 'print', uri: pdfUri };
  } catch (printErr) {
    try {
      await withTimeout(Print.printAsync({ html }), 15000, 'HTML print');
      return { mode: 'print-html', uri: pdfUri };
    } catch {
      const share = await sharePdfUri(pdfUri);
      return {
        mode: 'share-fallback',
        uri: share.uri,
        printError: printErr?.message,
      };
    }
  }
}

export async function generateAndSharePdf(html) {
  const pdfUri = await createShareablePdfFromHtml(html);
  return sharePdfUri(pdfUri);
}
