import React from 'react';
import { Modal, ScrollView, StyleSheet, View } from 'react-native';

import { translate, fTranslate, isRTL } from './lang';
import { AppText, getRoundedButton, normalizeTitle, semanticColors } from './elements';
import { MyIcon } from './common/icons';

const ORIENTATIONS = ['portrait', 'portrait-upside-down', 'landscape', 'landscape-left', 'landscape-right'];

const SOURCE_CAPTION = {
  worksheet: 'ImportSourceWorksheet',
  folder: 'ImportSourceFolder',
  backup: 'ImportSourceBackup',
};

// Shown when an import ends: what was received, what already existed, what failed.
// report: see FileSystem.newImportReport
export function ImportReportDialog({ report, onClose }) {
  const rtl = isRTL();
  const textAlign = rtl ? 'right' : 'left';
  const hasErrors = report.failed.length > 0;
  const sheetLabel = s => {
    const folder = s.folder.split('/').map(normalizeTitle);
    const parts = [...folder, s.name];
    return (rtl ? parts.reverse() : parts).join(' / ');
  };

  const renderSection = (title, items, icon, color) => (
    <View style={styles.section}>
      <View style={[styles.sectionHeader, { flexDirection: rtl ? 'row-reverse' : 'row' }]}>
        <MyIcon info={{ type: 'MDI', name: icon, size: 24, color }} />
        <AppText style={[styles.sectionTitle, { textAlign }]}>{title} ({items.length})</AppText>
      </View>
      {items.map((item, i) => (
        <AppText key={i} style={[styles.item, { textAlign }]}>
          {rtl ? `${item} •` : `• ${item}`}
        </AppText>
      ))}
    </View>
  );

  return (
    <Modal visible transparent animationType="fade" supportedOrientations={ORIENTATIONS} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container} testID="import-report">
          <MyIcon info={{
            type: 'MDI',
            name: hasErrors ? 'alert-circle-outline' : 'check-circle-outline',
            size: 56,
            color: hasErrors ? semanticColors.deleteButton : semanticColors.okButton,
          }} />
          <AppText style={styles.title}>
            {translate(hasErrors ? 'PartialImport' : 'SuccessfulImport')}
          </AppText>
          {!!report.name && (
            <AppText style={styles.subtitle}>
              {fTranslate(SOURCE_CAPTION[report.kind], normalizeTitle(report.name))}
            </AppText>
          )}
          <View style={styles.separator} />
          <ScrollView style={styles.list}>
            {report.imported.length > 0 &&
              renderSection(translate('ImportedWorksheets'), report.imported.map(sheetLabel),
                'file-check-outline', semanticColors.okButton)}
            {report.skipped.length > 0 &&
              renderSection(translate('SkippedWorksheets'), report.skipped.map(sheetLabel),
                'file-outline', semanticColors.cancelButton)}
            {hasErrors &&
              renderSection(translate('FailedWorksheets'), report.failed.map(f => `${f.name}: ${f.error}`),
                'file-alert-outline', semanticColors.deleteButton)}
            {report.imported.length + report.skipped.length + report.failed.length === 0 && (
              <AppText style={[styles.item, { textAlign }]}>{translate('ImportedNoWorksheets')}</AppText>
            )}
          </ScrollView>
          {report.skipped.length > 0 && (
            <AppText style={[styles.note, { textAlign }]}>{translate('NoteSkippedWorksheets')}</AppText>
          )}
          <View style={styles.buttons}>
            {getRoundedButton(onClose, 'check', translate('BtnOK'), 30, 30, { width: 150, height: 50 },
              undefined, undefined, undefined, undefined, undefined, undefined, 'import-report-ok')}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#00000088',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    width: 420,
    maxWidth: '92%',
    maxHeight: '85%',
    alignItems: 'center',
  },
  title: {
    fontSize: 26,
    color: semanticColors.titleText,
    textAlign: 'center',
    marginTop: 6,
  },
  subtitle: {
    fontSize: 18,
    color: semanticColors.titleText,
    textAlign: 'center',
    marginTop: 4,
  },
  separator: {
    alignSelf: 'stretch',
    height: 1,
    backgroundColor: semanticColors.inputBorder,
    marginVertical: 12,
  },
  list: {
    alignSelf: 'stretch',
    flexGrow: 0,
  },
  section: {
    marginBottom: 12,
  },
  sectionHeader: {
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 20,
    color: semanticColors.titleText,
  },
  item: {
    fontSize: 18,
    marginHorizontal: 8,
  },
  note: {
    alignSelf: 'stretch',
    fontSize: 16,
    color: semanticColors.cancelButton,
    marginTop: 4,
  },
  buttons: {
    marginTop: 14,
  },
});
