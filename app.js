'use strict';

/* ================================================================
   CONSTANTS
================================================================ */
const CERT_W = 1056;
const CERT_H = 816;
const STORAGE_KEY = 'certifypro_v7';
const TABS = ['templates', 'designer', 'names'];

/* ================================================================
   STATE
================================================================ */
let state = {
  students: [],
  customTemplates: [],
  selectedTemplateId: 'ar-attendance',
  editingStudentId: null,
  modalStudent: null,
  modalTemplate: null,
  currentTab: 'templates',
  logo: null,
  logoPosition: 'top-center',
  logoSize: 85,
  bgImage: null,
  bgImageOpacity: 100,
  bgImageFit: 'cover',
  lang: 'ar',
  elements: [],        // working text elements for the on-canvas editor
  selectedElId: null,  // currently selected element id
  draft: {},           // values typed directly on the canvas before any entry is added
};

let previewScale = 1; // current scale of the live preview (set by scalePreview)

/* ================================================================
   UNDO / REDO HISTORY (design snapshots)
================================================================ */
let history = [];
let histIndex = -1;
let histTimer = null;

function designSnapshot() {
  return { cfg: getDesignerCfg(), elements: state.elements.map(e => ({ ...e })) };
}

/* Reset history to a single baseline (after loading a template) */
function resetHistory() {
  history = [designSnapshot()];
  histIndex = 0;
  updateUndoRedoButtons();
}

/* Record the current design. Debounced for rapid changes (sliders/drag). */
function pushHistory(immediate = false) {
  clearTimeout(histTimer);
  const doPush = () => {
    history = history.slice(0, histIndex + 1);     // drop any redo branch
    history.push(designSnapshot());
    if (history.length > 60) history.shift();       // cap memory
    histIndex = history.length - 1;
    updateUndoRedoButtons();
  };
  if (immediate) doPush(); else histTimer = setTimeout(doPush, 350);
}

function applySnapshot(s) {
  setDesignerCfg(s.cfg);                            // sets inputs without firing events
  state.elements = s.elements.map(e => ({ ...e }));
  state.selectedElId = null;
  updateMainPreview();
}

function undo() {
  clearTimeout(histTimer);
  if (histIndex > 0) { histIndex--; applySnapshot(history[histIndex]); updateUndoRedoButtons(); saveState(); }
}
function redo() {
  clearTimeout(histTimer);
  if (histIndex < history.length - 1) { histIndex++; applySnapshot(history[histIndex]); updateUndoRedoButtons(); saveState(); }
}

function updateUndoRedoButtons() {
  const u = document.getElementById('btnUndo'), r = document.getElementById('btnRedo');
  if (u) u.disabled = histIndex <= 0;
  if (r) r.disabled = histIndex >= history.length - 1;
}

/* ================================================================
   I18N — translations
================================================================ */
const I18N = {
  en: {
    brand: 'Majoodah Certificates',
    step_templates: 'Templates', step_designer: 'Designer', step_names: 'Names', step_generate: 'Generate',
    step1_badge: 'Step 1 of 4', step2_badge: 'Step 2 of 4 · Optional', step3_badge: 'Step 3 of 4', step4_badge: 'Step 4 of 4',
    templates_title: 'Choose a Template', templates_desc: 'Select a design or start from a blank canvas',
    create_custom: 'Create Custom', customize_designer: 'Customize in Designer',
    next_names: 'Next: Add Names', next_generate: 'Next: Generate', back: 'Back',
    designer_title: 'Template Designer', designer_desc: 'Control every detail — colors, sizes, fonts, and more',
    reset: 'Reset', save_template: 'Save Template', live_preview: 'Live Preview', zoom_preview: 'Enlarge', undo: 'Undo', redo: 'Redo',
    tab_bg_logo: 'Background & Logo', new_text: 'New text', add_text: 'Add Text',
    editor_hint: 'Tip: click any text on the certificate to edit, drag to move, or resize & recolor it.',
    el_delete: 'Delete', el_edit: 'Edit text',
    tab_style: 'Style', tab_text: 'Text', tab_decor: 'Decor', tab_media: 'Media',
    ctrl_background: 'Background', ctrl_preset: 'Preset', ctrl_color: 'Color', ctrl_gradient: 'Gradient', ctrl_gradient_end: 'Gradient End',
    ctrl_border: 'Border', ctrl_show_border: 'Show Border', ctrl_style: 'Style',
    ctrl_typography: 'Typography', ctrl_font: 'Font', ctrl_heading_color: 'Heading Color', ctrl_body_color: 'Body Color', ctrl_divider_color: 'Divider Color',
    ctrl_text_sizes: 'Text Sizes', ctrl_title_lbl: 'Title', ctrl_name_lbl: 'Name', ctrl_body_lbl: 'Body',
    ctrl_name_style: 'Name Style', ctrl_italic: 'Italic', ctrl_bold: 'Bold', ctrl_custom_color: 'Custom Color',
    ctrl_text_content: 'Text Content', ctrl_cert_title: 'Certificate Title', ctrl_subtitle: 'Subtitle', ctrl_after_name: 'After Name', ctrl_footer_note: 'Footer Note',
    ctrl_seal: 'Seal & Decoration', ctrl_show_seal: 'Show Seal', ctrl_seal_color: 'Seal Color', ctrl_symbol: 'Symbol', ctrl_corners: 'Corners', ctrl_accent_lines: 'Accent Lines',
    ctrl_visible_fields: 'Visible Fields', ctrl_school: 'School Name', ctrl_subject: 'Subject', ctrl_grade: 'Grade / Score', ctrl_instructor: 'Instructor', ctrl_date: 'Date',
    ctrl_logo: 'Logo / Image', logo_upload: 'Click or drag to upload', ctrl_position: 'Position', ctrl_size: 'Size', ctrl_change: 'Change', ctrl_remove: 'Remove',
    ctrl_save_as: 'Save As', ctrl_template_name: 'Template Name',
    ctrl_bg_image: 'Background Image', bgimg_upload: 'Click or drag a background',
    ctrl_bg_fit: 'Fit', ctrl_bg_opacity: 'Opacity',
    fit_cover: 'Cover', fit_contain: 'Contain', fit_stretch: 'Stretch',
    toast_bgimg_added: 'Background added!', toast_bgimg_removed: 'Background removed',
    preset_custom: 'Custom', preset_cream: 'Warm Cream', preset_blue: 'Sky Blue', preset_green: 'Mint Green', preset_purple: 'Soft Lavender', preset_dark: 'Dark Navy',
    corner_none: 'None', corner_brackets: 'L-Brackets', corner_stars: 'Stars ✦', corner_flourishes: 'Flourishes ❧',
    pos_top_center: 'Top Center', pos_top_left: 'Top Left', pos_top_right: 'Top Right', pos_bottom: 'Bottom Center',
    size_small: 'Small', size_medium: 'Medium', size_large: 'Large',
    names_title: 'Add Names', names_desc: 'Each entry generates one certificate',
    import_csv: 'Import CSV', clear_all: 'Clear All', add_entry: 'Add Entry', edit_entry: 'Edit Entry', save_changes: 'Save Changes',
    full_name: 'Full Name', f_school: 'School / Institution', f_subject: 'Subject / Course', f_grade: 'Grade / Score', f_instructor: 'Instructor', f_date: 'Date',
    cancel: 'Cancel', clear: 'Clear', entries_label: 'Entries', search_placeholder: 'Search…',
    col_name: 'Name', col_school: 'School', col_subject: 'Subject', col_grade: 'Grade', col_date: 'Date', col_actions: 'Actions',
    no_entries: 'No entries yet — add one above', no_matching: 'No matching entries',
    generate_title: 'Generate & Export', generate_desc: 'Preview and download all certificates',
    export_options: 'Export Options', template_label: 'Template', pages_label: 'Pages',
    preview_all: 'Preview All', download_pdf: 'Download All — PDF', download_zip: 'Download All — ZIP',
    export: 'Export', export_images: 'Images (ZIP)', export_pdf: 'PDF (one file)',
    preview_hint: 'Click', preview_hint2: 'to see your certificates',
    dl_image: 'Download Image', dl_pdf: 'Download PDF',
    blank_name: 'Blank Canvas', blank_desc: 'Start from scratch — full control over every detail',
    artpl_gold_name: 'Certificate of Appreciation', artpl_gold_desc: 'Arabic · elegant classic gold',
    artpl_royal_name: 'Certificate of Thanks', artpl_royal_desc: 'Arabic · luxurious dark royal',
    artpl_green_name: 'Certificate of Excellence', artpl_green_desc: 'Arabic · formal academic green',
    artpl_modern_name: 'Certificate of Completion', artpl_modern_desc: 'Arabic · modern purple style',
    open_designer: 'Open Designer', use_template: 'Use Template', selected: 'Selected', edit_in_designer: 'Edit in Designer',
    toast_reset: 'Designer reset to defaults', toast_saved: 'saved!', toast_selected: 'selected', custom: 'Custom',
    toast_added: 'Added', toast_updated: 'Updated', toast_removed: 'Removed', toast_enter_name: 'Please enter a name',
    toast_cleared: 'All entries cleared', toast_imported: 'Imported', toast_no_entries: 'Add entries first',
    toast_logo_uploaded: 'Logo uploaded!', toast_logo_removed: 'Logo removed', toast_logo_error: 'Could not load image', toast_img_file: 'Please select an image file',
    toast_pdf: 'PDF downloaded!', toast_zip: 'ZIP downloaded!', toast_img: 'Image downloaded!', toast_tpl_deleted: 'Template deleted', toast_certs_ready: 'certificate(s) ready',
    confirm_clear_all: 'Clear all', confirm_entries: 'entries?', confirm_remove: 'Remove', confirm_del_tpl: 'Delete this custom template?',
    rendering: 'Rendering', of: 'of', saving: 'Saving…', compressing: 'Compressing…', generating: 'Generating previews…',
    custom_template_desc: 'Custom template',
    dummy_name: 'Student Full Name', dummy_school: 'School Name', dummy_subject: 'Subject', dummy_instructor: 'Instructor',
    cert_date: 'Date', cert_grade: 'Grade', cert_instructor: 'Instructor',
  },
  ar: {
    brand: 'شهادات مجُودة',
    step_templates: 'القوالب', step_designer: 'المصمم', step_names: 'الأسماء', step_generate: 'إنشاء',
    step1_badge: 'الخطوة ١ من ٤', step2_badge: 'الخطوة ٢ من ٤ · اختياري', step3_badge: 'الخطوة ٣ من ٤', step4_badge: 'الخطوة ٤ من ٤',
    templates_title: 'اختر قالباً', templates_desc: 'اختر تصميماً أو ابدأ من صفحة فارغة',
    create_custom: 'إنشاء مخصص', customize_designer: 'التخصيص في المصمم',
    next_names: 'التالي: إضافة الأسماء', next_generate: 'التالي: الإنشاء', back: 'رجوع',
    designer_title: 'مصمم القوالب', designer_desc: 'تحكّم في كل التفاصيل — الألوان والأحجام والخطوط والمزيد',
    reset: 'إعادة تعيين', save_template: 'حفظ القالب', live_preview: 'معاينة مباشرة', zoom_preview: 'تكبير', undo: 'تراجع', redo: 'إعادة',
    tab_bg_logo: 'الخلفية والشعار', new_text: 'نص جديد', add_text: 'إضافة نص',
    editor_hint: 'تلميح: اضغط على أي نص في الشهادة لتعديله، اسحبه لتحريكه، أو غيّر حجمه ولونه.',
    el_delete: 'حذف', el_edit: 'تعديل النص',
    tab_style: 'النمط', tab_text: 'النص', tab_decor: 'الزخرفة', tab_media: 'الوسائط',
    ctrl_background: 'الخلفية', ctrl_preset: 'إعداد مسبق', ctrl_color: 'اللون', ctrl_gradient: 'تدرّج لوني', ctrl_gradient_end: 'نهاية التدرّج',
    ctrl_border: 'الإطار', ctrl_show_border: 'إظهار الإطار', ctrl_style: 'النمط',
    ctrl_typography: 'الخطوط', ctrl_font: 'الخط', ctrl_heading_color: 'لون العنوان', ctrl_body_color: 'لون النص', ctrl_divider_color: 'لون الفاصل',
    ctrl_text_sizes: 'أحجام النص', ctrl_title_lbl: 'العنوان', ctrl_name_lbl: 'الاسم', ctrl_body_lbl: 'النص',
    ctrl_name_style: 'نمط الاسم', ctrl_italic: 'مائل', ctrl_bold: 'عريض', ctrl_custom_color: 'لون مخصص',
    ctrl_text_content: 'محتوى النص', ctrl_cert_title: 'عنوان الشهادة', ctrl_subtitle: 'العنوان الفرعي', ctrl_after_name: 'بعد الاسم', ctrl_footer_note: 'ملاحظة التذييل',
    ctrl_seal: 'الختم والزخرفة', ctrl_show_seal: 'إظهار الختم', ctrl_seal_color: 'لون الختم', ctrl_symbol: 'الرمز', ctrl_corners: 'الزوايا', ctrl_accent_lines: 'خطوط زخرفية',
    ctrl_visible_fields: 'الحقول الظاهرة', ctrl_school: 'اسم المدرسة', ctrl_subject: 'المادة', ctrl_grade: 'الدرجة', ctrl_instructor: 'المعلّم', ctrl_date: 'التاريخ',
    ctrl_logo: 'الشعار / الصورة', logo_upload: 'انقر أو اسحب للرفع', ctrl_position: 'الموضع', ctrl_size: 'الحجم', ctrl_change: 'تغيير', ctrl_remove: 'إزالة',
    ctrl_save_as: 'حفظ باسم', ctrl_template_name: 'اسم القالب',
    ctrl_bg_image: 'صورة الخلفية', bgimg_upload: 'انقر أو اسحب صورة خلفية',
    ctrl_bg_fit: 'الملاءمة', ctrl_bg_opacity: 'الشفافية',
    fit_cover: 'تغطية', fit_contain: 'احتواء', fit_stretch: 'تمديد',
    toast_bgimg_added: 'تمت إضافة الخلفية!', toast_bgimg_removed: 'تمت إزالة الخلفية',
    preset_custom: 'مخصص', preset_cream: 'كريمي دافئ', preset_blue: 'أزرق سماوي', preset_green: 'أخضر نعناعي', preset_purple: 'بنفسجي ناعم', preset_dark: 'كحلي داكن',
    corner_none: 'بدون', corner_brackets: 'أقواس زاوية', corner_stars: 'نجوم ✦', corner_flourishes: 'زخارف ❧',
    pos_top_center: 'أعلى الوسط', pos_top_left: 'أعلى اليسار', pos_top_right: 'أعلى اليمين', pos_bottom: 'أسفل الوسط',
    size_small: 'صغير', size_medium: 'متوسط', size_large: 'كبير',
    names_title: 'إضافة الأسماء', names_desc: 'كل إدخال يُنشئ شهادة واحدة',
    import_csv: 'استيراد CSV', clear_all: 'مسح الكل', add_entry: 'إضافة إدخال', edit_entry: 'تعديل الإدخال', save_changes: 'حفظ التغييرات',
    full_name: 'الاسم الكامل', f_school: 'المدرسة / المؤسسة', f_subject: 'المادة / الدورة', f_grade: 'الدرجة', f_instructor: 'المعلّم', f_date: 'التاريخ',
    cancel: 'إلغاء', clear: 'مسح', entries_label: 'الإدخالات', search_placeholder: 'بحث…',
    col_name: 'الاسم', col_school: 'المدرسة', col_subject: 'المادة', col_grade: 'الدرجة', col_date: 'التاريخ', col_actions: 'إجراءات',
    no_entries: 'لا توجد إدخالات بعد — أضف واحداً أعلاه', no_matching: 'لا توجد إدخالات مطابقة',
    generate_title: 'الإنشاء والتصدير', generate_desc: 'عاين وحمّل جميع الشهادات',
    export_options: 'خيارات التصدير', template_label: 'القالب', pages_label: 'الصفحات',
    preview_all: 'معاينة الكل', download_pdf: 'تحميل الكل — PDF', download_zip: 'تحميل الكل — ZIP',
    export: 'تصدير', export_images: 'تصدير صور (ZIP)', export_pdf: 'ملف PDF',
    preview_hint: 'انقر على', preview_hint2: 'لعرض شهاداتك',
    dl_image: 'تحميل الصورة', dl_pdf: 'تحميل PDF',
    blank_name: 'صفحة فارغة', blank_desc: 'ابدأ من الصفر — تحكّم كامل في كل تفصيل',
    artpl_gold_name: 'شهادة تقدير', artpl_gold_desc: 'نمط ذهبي كلاسيكي أنيق',
    artpl_royal_name: 'شهادة شكر وتقدير', artpl_royal_desc: 'نمط ملكي فاخر بخلفية داكنة',
    artpl_green_name: 'شهادة تفوّق', artpl_green_desc: 'نمط أكاديمي أخضر رسمي',
    artpl_modern_name: 'شهادة إتمام', artpl_modern_desc: 'نمط عصري بسيط بلون بنفسجي',
    open_designer: 'فتح المصمم', use_template: 'استخدام القالب', selected: 'محدد', edit_in_designer: 'تعديل في المصمم',
    toast_reset: 'تمت إعادة تعيين المصمم', toast_saved: 'تم الحفظ!', toast_selected: 'محدد', custom: 'مخصص',
    toast_added: 'تمت الإضافة', toast_updated: 'تم التحديث', toast_removed: 'تمت الإزالة', toast_enter_name: 'الرجاء إدخال اسم',
    toast_cleared: 'تم مسح جميع الإدخالات', toast_imported: 'تم استيراد', toast_no_entries: 'أضف إدخالات أولاً',
    toast_logo_uploaded: 'تم رفع الشعار!', toast_logo_removed: 'تمت إزالة الشعار', toast_logo_error: 'تعذّر تحميل الصورة', toast_img_file: 'الرجاء اختيار ملف صورة',
    toast_pdf: 'تم تحميل PDF!', toast_zip: 'تم تحميل ZIP!', toast_img: 'تم تحميل الصورة!', toast_tpl_deleted: 'تم حذف القالب', toast_certs_ready: 'شهادة جاهزة',
    confirm_clear_all: 'مسح كل', confirm_entries: 'إدخال؟', confirm_remove: 'إزالة', confirm_del_tpl: 'حذف هذا القالب المخصص؟',
    rendering: 'جارٍ التجهيز', of: 'من', saving: 'جارٍ الحفظ…', compressing: 'جارٍ الضغط…', generating: 'جارٍ إنشاء المعاينات…',
    custom_template_desc: 'قالب مخصص',
    dummy_name: 'اسم الطالب الكامل', dummy_school: 'اسم المدرسة', dummy_subject: 'المادة', dummy_instructor: 'المعلّم',
    cert_date: 'التاريخ', cert_grade: 'الدرجة', cert_instructor: 'المعلّم',
  },
};

function t(key) {
  return (I18N[state.lang] && I18N[state.lang][key]) || I18N.en[key] || key;
}

/* ================================================================
   BUILT-IN TEMPLATES
================================================================ */
const BUILT_IN = [

  /* ════════════════ ENGLISH TEMPLATES ════════════════ */

  /* EN · Course Attendance — clean modern blue */
  {
    id: 'en-attendance', lang: 'en', category: 'attendance',
    name: 'Certificate of Attendance', description: 'Clean, professional course attendance design',
    renderer: 'designer', custom: false,
    cfg: {
      bg: '#ffffff', bg2: '#eef5ff', bgGradient: true,
      border: true, borderStyle: 'single', borderColor: '#2563eb',
      font: 'Montserrat', accentColor: '#1e3a8a', textColor: '#334155', dividerColor: '#60a5fa',
      title: 'Certificate of Attendance', subtitle: 'This is to certify that',
      body: 'has attended and completed the course', footer: 'In recognition of dedicated participation and commitment',
      showSchool: true, showSubject: true, showGrade: false, showInstructor: true, showDate: true,
      titleSize: 40, nameSize: 54, bodySize: 14,
      nameItalic: false, nameBold: true, nameColorEnabled: true, nameColor: '#1e3a8a',
      showSeal: false, sealColor: '#2563eb', sealSymbol: '\u2713',
      cornerStyle: 'none', showTopLine: true, padding: 58,
    }
  },
  /* EN · Appreciation — elegant gold */
  {
    id: 'en-appreciation', lang: 'en', category: 'appreciation',
    name: 'Certificate of Appreciation', description: 'Elegant gold style with seal',
    renderer: 'designer', custom: false,
    cfg: {
      bg: '#fffdf5', bg2: '#fdf3cf', bgGradient: true,
      border: true, borderStyle: 'double', borderColor: '#c9a84c',
      font: 'Playfair Display', accentColor: '#8b6914', textColor: '#5c3d1e', dividerColor: '#c9a84c',
      title: 'Certificate of Appreciation', subtitle: 'Proudly presented to',
      body: 'in sincere appreciation of outstanding contribution to', footer: 'With gratitude and heartfelt recognition',
      showSchool: true, showSubject: true, showGrade: false, showInstructor: true, showDate: true,
      titleSize: 40, nameSize: 56, bodySize: 14,
      nameItalic: true, nameBold: true, nameColorEnabled: true, nameColor: '#3d1a00',
      showSeal: true, sealColor: '#c9a84c', sealSymbol: '\u2605',
      cornerStyle: 'brackets', showTopLine: true, padding: 56,
    }
  },
  /* EN · Graduation — formal academic navy & gold */
  {
    id: 'en-graduation', lang: 'en', category: 'graduation',
    name: 'Certificate of Graduation', description: 'Formal academic navy & gold',
    renderer: 'designer', custom: false,
    cfg: {
      bg: '#fbfaf7', bg2: '#f1ece0', bgGradient: true,
      border: true, borderStyle: 'double', borderColor: '#14213d',
      font: 'Cormorant Garamond', accentColor: '#14213d', textColor: '#3d3527', dividerColor: '#b8902f',
      title: 'Certificate of Graduation', subtitle: 'This certifies that',
      body: 'has successfully fulfilled all requirements and graduated from', footer: 'Awarded with honors and distinction',
      showSchool: true, showSubject: true, showGrade: true, showInstructor: true, showDate: true,
      titleSize: 40, nameSize: 56, bodySize: 14,
      nameItalic: true, nameBold: true, nameColorEnabled: true, nameColor: '#14213d',
      showSeal: true, sealColor: '#b8902f', sealSymbol: '\u269c',
      cornerStyle: 'flourishes', showTopLine: true, padding: 54,
    }
  },

  /* ════════════════ ARABIC TEMPLATES ════════════════ */

  /* AR · حضور دورة — أزرق عصري */
  {
    id: 'ar-attendance', lang: 'ar', category: 'attendance',
    name: 'شهادة حضور دورة', description: 'تصميم عصري نظيف لحضور الدورات',
    renderer: 'designer', custom: false,
    cfg: {
      bg: '#ffffff', bg2: '#eef5ff', bgGradient: true,
      border: true, borderStyle: 'single', borderColor: '#2563eb',
      font: 'Cairo', accentColor: '#1e3a8a', textColor: '#334155', dividerColor: '#60a5fa',
      title: 'شهادة حضور دورة', subtitle: 'تشهد إدارة المؤسسة بأن',
      body: 'قد حضر وأتمّ فعاليات دورة', footer: 'تقديراً لحضوره الكامل وتفاعله المتميّز',
      showSchool: true, showSubject: true, showGrade: false, showInstructor: true, showDate: true,
      titleSize: 42, nameSize: 52, bodySize: 16,
      nameItalic: false, nameBold: true, nameColorEnabled: true, nameColor: '#1e3a8a',
      showSeal: false, sealColor: '#2563eb', sealSymbol: '\u2713',
      cornerStyle: 'none', showTopLine: true, padding: 56, rtl: true,
    }
  },
  /* AR · شكر وتقدير — ذهبي أنيق */
  {
    id: 'ar-appreciation', lang: 'ar', category: 'appreciation',
    name: 'شهادة شكر وتقدير', description: 'تصميم ذهبي أنيق مع ختم',
    renderer: 'designer', custom: false,
    cfg: {
      bg: '#fffdf5', bg2: '#fdf3cf', bgGradient: true,
      border: true, borderStyle: 'double', borderColor: '#c9a84c',
      font: 'Cairo', accentColor: '#8b6914', textColor: '#5c3d1e', dividerColor: '#c9a84c',
      title: 'شهادة شكر وتقدير', subtitle: 'تُمنح هذه الشهادة إلى',
      body: 'عرفاناً وتقديراً لجهوده المبذولة في', footer: 'مع خالص الشكر والتقدير والامتنان',
      showSchool: true, showSubject: true, showGrade: false, showInstructor: true, showDate: true,
      titleSize: 42, nameSize: 54, bodySize: 16,
      nameItalic: false, nameBold: true, nameColorEnabled: true, nameColor: '#3d1a00',
      showSeal: true, sealColor: '#c9a84c', sealSymbol: '\u2605',
      cornerStyle: 'brackets', showTopLine: true, padding: 54, rtl: true,
    }
  },
  /* AR · تخرّج — كحلي وذهبي رسمي */
  {
    id: 'ar-graduation', lang: 'ar', category: 'graduation',
    name: 'شهادة تخرّج', description: 'تصميم أكاديمي رسمي كحلي وذهبي',
    renderer: 'designer', custom: false,
    cfg: {
      bg: '#fbfaf7', bg2: '#f1ece0', bgGradient: true,
      border: true, borderStyle: 'double', borderColor: '#14213d',
      font: 'Cairo', accentColor: '#14213d', textColor: '#3d3527', dividerColor: '#b8902f',
      title: 'شهادة تخرّج', subtitle: 'تشهد إدارة المؤسسة بأن',
      body: 'قد أتمّ بنجاح متطلبات التخرّج من', footer: 'مُنحت بمرتبة الشرف والتميّز',
      showSchool: true, showSubject: true, showGrade: true, showInstructor: true, showDate: true,
      titleSize: 42, nameSize: 54, bodySize: 16,
      nameItalic: false, nameBold: true, nameColorEnabled: true, nameColor: '#14213d',
      showSeal: true, sealColor: '#b8902f', sealSymbol: '\u269c',
      cornerStyle: 'flourishes', showTopLine: true, padding: 54, rtl: true,
    }
  },
];

/* ================================================================
   RENDERER DISPATCH
================================================================ */
const RENDERERS = {
  'classic-gold': renderClassicGold,
  'modern-blue':  renderModernBlue,
  'elegant-dark': renderElegantDark,
  'minimal':      renderMinimal,
  'academic':     renderAcademic,
  'royal-purple': renderRoyalPurple,
  'designer':     renderDesignerCert,
};

function renderCertificate(template, student, interactive = false) {
  let el;
  if (template.renderer === 'designer' || !RENDERERS[template.renderer]) {
    el = renderDesignerCert(template.cfg, student, interactive);
  } else {
    el = RENDERERS[template.renderer](template.cfg, student);
  }
  // Inject background image behind the content (above the base color/gradient)
  if (state.bgImage) {
    const layer = htmlEl(bgImageLayer());
    if (layer) el.insertBefore(layer, el.firstChild);
  }
  return el;
}

/* ── Parse HTML string → element ── */
function htmlEl(html) {
  const d = document.createElement('div');
  d.innerHTML = html.trim();
  return d.firstElementChild;
}

/* ── Background image layer (behind all content) ── */
function bgImageLayer() {
  if (!state.bgImage) return '';
  const op = (state.bgImageOpacity ?? 100) / 100;
  const fitMap = { cover: 'cover', contain: 'contain', stretch: '100% 100%' };
  const size = fitMap[state.bgImageFit] || 'cover';
  return `<div style="position:absolute;inset:0;z-index:0;background-image:url('${state.bgImage}');background-size:${size};background-position:center;background-repeat:no-repeat;opacity:${op};pointer-events:none;"></div>`;
}

/* ── Logo overlay ── */
function logoOverlay() {
  if (!state.logo) return '';
  const h = state.logoSize || 85;
  const posMap = {
    'top-center':    `top:46px;left:50%;transform:translateX(-50%)`,
    'top-left':      `top:46px;left:58px`,
    'top-right':     `top:46px;right:58px`,
    'bottom-center': `bottom:46px;left:50%;transform:translateX(-50%)`,
  };
  const p = posMap[state.logoPosition] || posMap['top-center'];
  return `<img src="${state.logo}" alt="Logo" style="position:absolute;${p};height:${h}px;width:auto;max-width:240px;object-fit:contain;z-index:10;pointer-events:none;">`;
}

/* ── Bottom fields ── */
function buildBottomFields(cfg, student) {
  const date = student.date ? formatDate(student.date) : '';
  const fields = [];
  if (cfg.showDate && date) fields.push({ l: t('cert_date'), v: date });
  if (cfg.showGrade && student.grade) fields.push({ l: t('cert_grade'), v: student.grade });
  if (cfg.showInstructor && student.instructor) fields.push({ l: t('cert_instructor'), v: student.instructor });
  return fields;
}

/* ── Lighten hex color ── */
function lighten(hex, amt = 60) {
  const c = hex.replace('#', '');
  const r = Math.min(255, parseInt(c.substr(0,2),16) + amt);
  const g = Math.min(255, parseInt(c.substr(2,2),16) + amt);
  const b = Math.min(255, parseInt(c.substr(4,2),16) + amt);
  return `rgb(${r},${g},${b})`;
}

function isArabicStr(s) { return /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/.test(s || ''); }

/* ================================================================
   ELEMENT-BASED EDITOR MODEL
   Each text item on the certificate is a positioned, editable element.
================================================================ */
const EDITABLE_ROLES = ['title', 'subtitle', 'body', 'footer', 'custom'];
const DATA_ROLES = ['name', 'school', 'subject', 'date', 'grade', 'instructor'];
// Every data field can be typed directly on the certificate.
const TYPEABLE_DATA = ['name', 'school', 'subject', 'date', 'grade', 'instructor'];
// Everything that enters inline-edit mode on a click = all text on the certificate.
const TYPEABLE_ROLES = [...EDITABLE_ROLES, ...TYPEABLE_DATA];

function roleLabel(role) {
  const map = { title: t('ctrl_cert_title'), subtitle: t('ctrl_subtitle'), body: t('ctrl_after_name'),
    footer: t('ctrl_footer_note'), name: t('full_name'), school: t('ctrl_school'),
    subject: t('ctrl_subject'), date: t('cert_date'), grade: t('cert_grade'), instructor: t('cert_instructor'),
    custom: t('new_text') };
  return map[role] || role;
}

/* Build default positioned elements from a template config */
function buildElements(cfg) {
  if (Array.isArray(cfg.elements) && cfg.elements.length) {
    return cfg.elements.map(e => ({ ...e }));
  }
  const accent = cfg.accentColor || '#1e293b';
  const text   = cfg.textColor   || '#475569';
  const nameColor = (cfg.nameColorEnabled && cfg.nameColor) ? cfg.nameColor : accent;
  const tSize = cfg.titleSize || 40, nSize = cfg.nameSize || 52, bSize = cfg.bodySize || 15;
  const els = [];
  const add = (o) => els.push({ id: uid(), italic: false, weight: 400, align: 'center', ...o });

  add({ role: 'title', text: cfg.title || '', x: 50, y: 19, size: tSize, color: accent, weight: 700 });
  if (cfg.showSchool) add({ role: 'school', x: 50, y: 28, size: 15, color: accent, weight: 600 });
  add({ role: 'subtitle', text: cfg.subtitle || '', x: 50, y: 36, size: bSize, color: text });
  add({ role: 'name', x: 50, y: 47, size: nSize, color: nameColor, weight: cfg.nameBold !== false ? 700 : 400, italic: !!cfg.nameItalic });
  add({ role: 'body', text: cfg.body || '', x: 50, y: 59, size: bSize, color: text });
  if (cfg.showSubject) add({ role: 'subject', x: 50, y: 66, size: Math.round(nSize * 0.5), color: accent, weight: 700 });
  if (cfg.footer) add({ role: 'footer', text: cfg.footer, x: 50, y: 75, size: 12, color: text });

  // Bottom data fields, evenly distributed
  const bottom = [];
  if (cfg.showDate) bottom.push('date');
  if (cfg.showGrade) bottom.push('grade');
  if (cfg.showInstructor) bottom.push('instructor');
  bottom.forEach((role, i) => {
    const x = bottom.length === 1 ? 50 : 22 + (56 / (bottom.length - 1)) * i;
    add({ role, x, y: 88, size: 15, color: accent, weight: 600 });
  });
  return els;
}

/* Resolve an element's display content for a given student.
   The editable value is wrapped in <span class="cel-val"> so inline editing
   targets the value only (not the small field label). */
function elContent(el, student, interactive) {
  // Free custom / fixed text blocks
  if (EDITABLE_ROLES.includes(el.role)) {
    const txt = esc(el.text || '');
    if (!txt && !interactive) return '';
    return `<span class="cel-val">${txt || (interactive ? `<span style="opacity:.4">${roleLabel(el.role)}</span>` : '')}</span>`;
  }

  // Data fields
  let val = '';
  switch (el.role) {
    case 'name': val = student.name || ''; break;
    case 'school': val = student.school || ''; break;
    case 'subject': val = student.subject || ''; break;
    case 'date': val = (student.dateText != null && student.dateText !== '') ? student.dateText : (student.date ? formatDate(student.date) : ''); break;
    case 'grade': val = student.grade || ''; break;
    case 'instructor': val = student.instructor || ''; break;
  }
  const valHTML = esc(val) || (interactive ? `<span style="opacity:.4">${roleLabel(el.role)}</span>` : '');

  // Fields shown with a small label above the value
  if (['date', 'grade', 'instructor'].includes(el.role)) {
    if (!val && !interactive) return '';
    return `<div style="font-size:.55em;opacity:.65;font-weight:400;margin-bottom:2px;" contenteditable="false">${roleLabel(el.role)}</div><span class="cel-val">${valHTML}</span>`;
  }
  if (!val && !interactive) return '';
  return `<span class="cel-val">${valHTML}</span>`;
}

/* Background + decorations (border, corners, seal, accent line) */
function decorHTML(cfg, rtl) {
  const borderMap = { single:`border:2px solid ${cfg.borderColor}`, double:`border:3px double ${cfg.borderColor}`, thick:`border:5px solid ${cfg.borderColor}`, dashed:`border:2px dashed ${cfg.borderColor}` };
  const borderCSS = cfg.border ? (borderMap[cfg.borderStyle] || borderMap.single) : '';
  let h = '';
  if (cfg.border) h += `<div style="position:absolute;inset:14px;${borderCSS};box-sizing:border-box;pointer-events:none;"></div>`;
  if (cfg.border && cfg.borderStyle === 'double') h += `<div style="position:absolute;inset:24px;border:1px solid ${cfg.borderColor}50;box-sizing:border-box;pointer-events:none;"></div>`;
  // corners
  if (cfg.cornerStyle === 'brackets') {
    h += `<div style="position:absolute;top:8px;left:8px;width:44px;height:44px;border-top:3px solid ${cfg.borderColor};border-left:3px solid ${cfg.borderColor};"></div>
      <div style="position:absolute;top:8px;right:8px;width:44px;height:44px;border-top:3px solid ${cfg.borderColor};border-right:3px solid ${cfg.borderColor};"></div>
      <div style="position:absolute;bottom:8px;left:8px;width:44px;height:44px;border-bottom:3px solid ${cfg.borderColor};border-left:3px solid ${cfg.borderColor};"></div>
      <div style="position:absolute;bottom:8px;right:8px;width:44px;height:44px;border-bottom:3px solid ${cfg.borderColor};border-right:3px solid ${cfg.borderColor};"></div>`;
  } else if (cfg.cornerStyle === 'stars') {
    h += ['top:7px;left:7px','top:7px;right:7px','bottom:7px;left:7px','bottom:7px;right:7px']
      .map(p => `<div style="position:absolute;${p};font-size:28px;color:${cfg.borderColor};line-height:1;">✦</div>`).join('');
  } else if (cfg.cornerStyle === 'flourishes') {
    const tr = [['top:6px;left:6px',''],['top:6px;right:6px','transform:scaleX(-1)'],['bottom:6px;left:6px','transform:scaleY(-1)'],['bottom:6px;right:6px','transform:scale(-1,-1)']];
    h += tr.map(([p,x]) => `<div style="position:absolute;${p};font-size:26px;color:${cfg.borderColor};line-height:1;${x}">❧</div>`).join('');
  }
  // top accent line
  if (cfg.showTopLine !== false) {
    h += `<div style="position:absolute;top:11%;left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:12px;width:60%;pointer-events:none;">
      <div style="flex:1;height:1px;background:linear-gradient(to right,transparent,${cfg.dividerColor});"></div>
      <span style="font-size:13px;color:${cfg.dividerColor};">✦</span>
      <div style="flex:1;height:1px;background:linear-gradient(to left,transparent,${cfg.dividerColor});"></div>
    </div>`;
  }
  // seal (bottom corner)
  if (cfg.showSeal) {
    const sc = cfg.sealColor || '#c9a84c';
    const sx = rtl ? 'left:12%' : 'right:12%';
    h += `<div style="position:absolute;${sx};top:84%;transform:translateY(-50%);width:74px;height:74px;border-radius:50%;
      background:radial-gradient(circle at 38% 35%,${lighten(sc)},${sc});
      box-shadow:0 0 0 2.5px ${sc},0 0 0 5px ${cfg.bg || '#fff'},0 0 0 7px ${sc}50;
      display:flex;align-items:center;justify-content:center;pointer-events:none;">
      <span style="font-size:30px;color:#fff;text-shadow:0 1px 4px rgba(0,0,0,.4);">${cfg.sealSymbol || '★'}</span>
    </div>`;
  }
  return h;
}

/* Render a designer certificate (element-based). interactive=true adds editing hooks. */
function renderDesignerCert(cfg, student, interactive) {
  const elements = (Array.isArray(cfg.elements) && cfg.elements.length) ? cfg.elements : buildElements(cfg);
  const bgStyle = cfg.bgGradient
    ? `background:linear-gradient(135deg,${cfg.bg} 0%,${cfg.bg2} 100%)`
    : `background:${cfg.bg}`;
  const rtl = cfg.rtl || cfg.font === 'Cairo' || isArabicStr(`${cfg.title}${cfg.subtitle}${cfg.body}${cfg.footer}`);

  const elsHTML = elements.map(el => {
    const content = elContent(el, student, interactive);
    if (!content && !interactive) return '';
    const elRtl = rtl || isArabicStr(el.text);
    return `<div class="cel${interactive ? ' cel-i' : ''}" data-id="${el.id}" data-role="${el.role}"
      style="position:absolute;left:${el.x}%;top:${el.y}%;transform:translate(-50%,-50%);
      font-family:'${el.font || cfg.font}',serif;font-size:${el.size}px;color:${el.color};
      font-weight:${el.weight};font-style:${el.italic ? 'italic' : 'normal'};
      text-align:${el.align || 'center'};max-width:90%;line-height:1.3;${elRtl ? 'direction:rtl;' : ''}">${content}</div>`;
  }).join('');

  return htmlEl(`
    <div class="cert-root${interactive ? ' cert-edit' : ''}" style="width:${CERT_W}px;height:${CERT_H}px;position:relative;overflow:hidden;${bgStyle};font-family:'${cfg.font}',serif;box-sizing:border-box;${rtl ? 'direction:rtl;' : ''}">
      ${decorHTML(cfg, rtl)}
      ${elsHTML}
      ${logoOverlay()}
    </div>
  `);
}

/* ================================================================
   CERTIFICATE RENDERERS
================================================================ */

/* ── Classic Gold ── */
function renderClassicGold(cfg, student) {
  const fields = buildBottomFields(cfg, student);
  const left = fields.slice(0, Math.ceil(fields.length / 2));
  const right = fields.slice(Math.ceil(fields.length / 2));
  const fHtml = (arr) => arr.map(f => `
    <div style="text-align:center;min-width:90px;">
      <div style="font-size:9px;letter-spacing:.14em;text-transform:uppercase;color:#8b6914;opacity:.75;font-family:'Playfair Display',serif;">${f.l}</div>
      <div style="font-size:13px;font-weight:700;color:#4a2512;margin-top:4px;padding-top:5px;border-top:1.5px solid #c9a84c60;font-family:'Playfair Display',serif;">${f.v}</div>
    </div>
  `).join('');

  return htmlEl(`
    <div style="width:${CERT_W}px;height:${CERT_H}px;position:relative;overflow:hidden;background:linear-gradient(155deg,#fef9ec 0%,#fdf4ce 45%,#fef9ec 100%);font-family:'Playfair Display',Georgia,serif;box-sizing:border-box;">
      <div style="position:absolute;inset:14px;border:2.5px double #c9a84c;box-sizing:border-box;pointer-events:none;"></div>
      <div style="position:absolute;inset:24px;border:1px solid #c9a84c55;box-sizing:border-box;pointer-events:none;"></div>
      <div style="position:absolute;top:7px;left:7px;width:46px;height:46px;border-top:3.5px solid #8b6914;border-left:3.5px solid #8b6914;pointer-events:none;"></div>
      <div style="position:absolute;top:7px;right:7px;width:46px;height:46px;border-top:3.5px solid #8b6914;border-right:3.5px solid #8b6914;pointer-events:none;"></div>
      <div style="position:absolute;bottom:7px;left:7px;width:46px;height:46px;border-bottom:3.5px solid #8b6914;border-left:3.5px solid #8b6914;pointer-events:none;"></div>
      <div style="position:absolute;bottom:7px;right:7px;width:46px;height:46px;border-bottom:3.5px solid #8b6914;border-right:3.5px solid #8b6914;pointer-events:none;"></div>
      <div style="position:absolute;top:32px;left:70px;right:70px;text-align:center;font-size:11px;color:#c9a84c;letter-spacing:8px;">❧ · · · · · · · · · · · · · · ❧ · · · · · · · · · · · · · · ❧</div>
      <div style="position:absolute;inset:56px 60px 52px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;">
        <div style="font-size:38px;font-weight:700;color:#8b6914;letter-spacing:.015em;line-height:1.15;">${cfg.title}</div>
        ${cfg.showSchool && student.school ? `<div style="font-size:12px;color:#8b6914;letter-spacing:.18em;text-transform:uppercase;margin-top:7px;opacity:.8;">${student.school}</div>` : ''}
        <div style="font-size:14px;color:${cfg.textColor};letter-spacing:.12em;text-transform:uppercase;margin-top:18px;opacity:.85;">${cfg.subtitle}</div>
        <div style="font-size:54px;font-style:italic;font-weight:700;color:#3d1a00;margin:8px 0 2px;line-height:1.15;max-width:740px;word-break:break-word;">${student.name || 'Student Name'}</div>
        <div style="display:flex;align-items:center;gap:12px;width:52%;margin:8px 0;">
          <div style="flex:1;height:1px;background:linear-gradient(to right,transparent,#c9a84c);"></div>
          <span style="font-size:14px;color:#c9a84c;">◆ ◆ ◆</span>
          <div style="flex:1;height:1px;background:linear-gradient(to left,transparent,#c9a84c);"></div>
        </div>
        <div style="font-size:15px;color:${cfg.textColor};letter-spacing:.07em;">${cfg.body}</div>
        ${cfg.showSubject && student.subject ? `<div style="font-size:27px;font-weight:700;color:#8b6914;margin-top:8px;">${student.subject}</div>` : ''}
        ${cfg.footer ? `<div style="font-size:11px;color:${cfg.textColor};opacity:.55;margin-top:12px;font-style:italic;letter-spacing:.04em;max-width:520px;line-height:1.5;">${cfg.footer}</div>` : ''}
        <div style="display:flex;align-items:center;justify-content:space-between;width:100%;margin-top:22px;padding-top:14px;border-top:1px solid #c9a84c45;gap:16px;">
          <div style="display:flex;gap:20px;flex:1;justify-content:flex-start;">${fHtml(left)}</div>
          <div style="flex-shrink:0;width:72px;height:72px;border-radius:50%;background:radial-gradient(circle at 38% 35%,#f5d878 0%,#d4a017 48%,#8b6914 100%);box-shadow:0 0 0 2.5px #c9a84c,0 0 0 5px #fef9ec,0 0 0 7px #c9a84c,0 0 0 10px #fdf4ce;display:flex;align-items:center;justify-content:center;">
            <span style="font-size:30px;color:#fff8d0;text-shadow:0 1px 4px rgba(0,0,0,.4);">★</span>
          </div>
          <div style="display:flex;gap:20px;flex:1;justify-content:flex-end;">${fHtml(right)}</div>
        </div>
      </div>
      <div style="position:absolute;bottom:32px;left:70px;right:70px;text-align:center;font-size:11px;color:#c9a84c;letter-spacing:8px;">❧ · · · · · · · · · · · · · · ❧ · · · · · · · · · · · · · · ❧</div>
      ${logoOverlay()}
    </div>
  `);
}

/* ── Modern Blue ── */
function renderModernBlue(cfg, student) {
  const fields = buildBottomFields(cfg, student);
  return htmlEl(`
    <div style="width:${CERT_W}px;height:${CERT_H}px;position:relative;overflow:hidden;background:#ffffff;font-family:'Montserrat',Arial,sans-serif;box-sizing:border-box;">
      <div style="position:absolute;top:0;left:0;right:0;height:152px;background:linear-gradient(135deg,#0f2460 0%,#1e40af 55%,#2563eb 100%);overflow:hidden;">
        <div style="position:absolute;top:-30px;right:90px;width:4px;height:220px;background:rgba(255,255,255,.07);transform:rotate(18deg);"></div>
        <div style="position:absolute;top:-30px;right:50px;width:8px;height:220px;background:rgba(255,255,255,.05);transform:rotate(18deg);"></div>
        <div style="position:absolute;top:-40px;right:-40px;width:160px;height:160px;border-radius:50%;background:rgba(255,255,255,.05);"></div>
        <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:0 80px;">
          ${cfg.showSchool && student.school ? `<div style="font-size:10px;letter-spacing:.28em;text-transform:uppercase;color:rgba(255,255,255,.65);margin-bottom:7px;font-weight:600;">${student.school}</div>` : ''}
          <div style="font-size:32px;font-weight:800;color:#ffffff;letter-spacing:.06em;text-transform:uppercase;line-height:1.1;">${cfg.title}</div>
        </div>
      </div>
      <div style="position:absolute;left:0;top:152px;bottom:82px;width:5px;background:linear-gradient(to bottom,#1e40af,#60a5fa,#1e40af);"></div>
      <div style="position:absolute;right:0;top:152px;bottom:82px;width:5px;background:linear-gradient(to bottom,#1e40af,#60a5fa,#1e40af);"></div>
      <div style="position:absolute;top:152px;left:0;right:0;bottom:82px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:20px 90px;">
        <div style="font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#64748b;margin-bottom:14px;font-weight:600;">${cfg.subtitle}</div>
        <div style="font-size:54px;font-weight:800;color:#1e3a8a;line-height:1.05;max-width:740px;word-break:break-word;margin-bottom:10px;letter-spacing:-.01em;">${student.name || 'Student Name'}</div>
        <div style="width:88px;height:4px;background:linear-gradient(to right,#1e40af,#60a5fa);border-radius:2px;margin-bottom:14px;"></div>
        <div style="font-size:14px;color:#475569;margin-bottom:10px;font-weight:500;">${cfg.body}</div>
        ${cfg.showSubject && student.subject ? `<div style="font-size:24px;font-weight:700;color:#1e40af;margin-bottom:6px;">${student.subject}</div>` : ''}
        ${cfg.showGrade && student.grade ? `<div style="margin-top:12px;display:inline-flex;align-items:center;gap:9px;background:#eff6ff;border:2px solid #bfdbfe;border-radius:30px;padding:5px 22px;"><span style="font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:#2563eb;font-weight:700;">Grade</span><span style="font-size:16px;font-weight:800;color:#1e3a8a;">${student.grade}</span></div>` : ''}
        ${cfg.footer ? `<div style="font-size:11px;color:#94a3b8;margin-top:14px;font-style:italic;">${cfg.footer}</div>` : ''}
      </div>
      <div style="position:absolute;bottom:0;left:0;right:0;height:82px;background:linear-gradient(135deg,#0f2460 0%,#1e40af 55%,#2563eb 100%);display:flex;align-items:center;justify-content:space-around;padding:0 70px;">
        ${fields.map((f, i) => `${i > 0 ? `<div style="width:1px;height:38px;background:rgba(255,255,255,.18);"></div>` : ''}<div style="text-align:center;"><div style="font-size:9px;letter-spacing:.18em;text-transform:uppercase;color:rgba(255,255,255,.55);font-weight:600;margin-bottom:3px;">${f.l}</div><div style="font-size:13px;font-weight:700;color:#ffffff;">${f.v}</div></div>`).join('')}
      </div>
      ${logoOverlay()}
    </div>
  `);
}

/* ── Elegant Dark ── */
function renderElegantDark(cfg, student) {
  const fields = buildBottomFields(cfg, student);
  return htmlEl(`
    <div style="width:${CERT_W}px;height:${CERT_H}px;position:relative;overflow:hidden;background:radial-gradient(ellipse at 50% 30%,#1e2550 0%,#0f1322 60%,#08091a 100%);font-family:'Cormorant Garamond',Georgia,serif;box-sizing:border-box;">
      <div style="position:absolute;inset:12px;border:2px solid #c9a84c;box-sizing:border-box;pointer-events:none;"></div>
      <div style="position:absolute;inset:20px;border:1px solid #c9a84c45;box-sizing:border-box;pointer-events:none;"></div>
      <div style="position:absolute;top:5px;left:5px;font-size:28px;color:#c9a84c;line-height:1;">✦</div>
      <div style="position:absolute;top:5px;right:5px;font-size:28px;color:#c9a84c;line-height:1;">✦</div>
      <div style="position:absolute;bottom:5px;left:5px;font-size:28px;color:#c9a84c;line-height:1;">✦</div>
      <div style="position:absolute;bottom:5px;right:5px;font-size:28px;color:#c9a84c;line-height:1;">✦</div>
      <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:600px;height:400px;border-radius:50%;background:radial-gradient(ellipse,rgba(201,168,76,.06) 0%,transparent 70%);pointer-events:none;"></div>
      <div style="position:absolute;inset:44px 60px 44px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;">
        <div style="display:flex;align-items:center;gap:14px;width:70%;margin-bottom:16px;"><div style="flex:1;height:1px;background:linear-gradient(to right,transparent,#c9a84c);"></div><span style="font-size:12px;color:#c9a84c;letter-spacing:8px;">✦ ✦ ✦</span><div style="flex:1;height:1px;background:linear-gradient(to left,transparent,#c9a84c);"></div></div>
        <div style="font-size:36px;font-weight:600;color:#f0d080;letter-spacing:.06em;line-height:1.2;">${cfg.title}</div>
        ${cfg.showSchool && student.school ? `<div style="font-size:11px;letter-spacing:.22em;text-transform:uppercase;color:#c9a84c;opacity:.8;margin-top:8px;">${student.school}</div>` : ''}
        <div style="font-size:13px;letter-spacing:.15em;text-transform:uppercase;color:#e8d5a3;opacity:.7;margin-top:18px;">${cfg.subtitle}</div>
        <div style="font-size:56px;font-style:italic;font-weight:700;color:#f5d878;margin:10px 0 4px;line-height:1.1;max-width:740px;word-break:break-word;text-shadow:0 2px 20px rgba(245,216,120,.3);">${student.name || 'Student Name'}</div>
        <div style="display:flex;align-items:center;gap:14px;width:48%;margin:8px 0;"><div style="flex:1;height:1px;background:#c9a84c;opacity:.6;"></div><span style="font-size:13px;color:#c9a84c;">◆</span><div style="flex:1;height:1px;background:#c9a84c;opacity:.6;"></div></div>
        <div style="font-size:15px;color:#e8d5a3;letter-spacing:.08em;margin-top:2px;opacity:.8;">${cfg.body}</div>
        ${cfg.showSubject && student.subject ? `<div style="font-size:26px;font-weight:600;color:#f0d080;margin-top:8px;">${student.subject}</div>` : ''}
        ${cfg.footer ? `<div style="font-size:11px;color:#e8d5a3;opacity:.45;margin-top:12px;font-style:italic;max-width:500px;">${cfg.footer}</div>` : ''}
        ${fields.length ? `<div style="display:flex;justify-content:space-around;align-items:center;width:90%;margin-top:22px;padding-top:14px;border-top:1px solid #c9a84c30;gap:12px;">${fields.map((f,i)=>`${i>0?`<div style="width:1px;height:36px;background:#c9a84c30;"></div>`:''}<div style="text-align:center;"><div style="font-size:9px;letter-spacing:.16em;text-transform:uppercase;color:#c9a84c;opacity:.7;">${f.l}</div><div style="font-size:14px;font-weight:600;color:#f5d878;margin-top:4px;">${f.v}</div></div>`).join('')}</div>` : ''}
      </div>
      ${logoOverlay()}
    </div>
  `);
}

/* ── Minimalist ── */
function renderMinimal(cfg, student) {
  const fields = buildBottomFields(cfg, student);
  return htmlEl(`
    <div style="width:${CERT_W}px;height:${CERT_H}px;position:relative;overflow:hidden;background:#ffffff;font-family:'Lato',Arial,sans-serif;box-sizing:border-box;">
      <div style="position:absolute;top:0;left:0;right:0;height:7px;background:linear-gradient(to right,#5b6af0,#818cf8,#a5b4fc);"></div>
      <div style="position:absolute;bottom:0;left:0;right:0;height:4px;background:linear-gradient(to right,#5b6af0,#818cf8);"></div>
      <div style="position:absolute;inset:20px 24px;border:1.5px solid #e2e8f0;box-sizing:border-box;pointer-events:none;"></div>
      <div style="position:absolute;right:-20px;bottom:-60px;font-size:320px;font-weight:900;color:#f0f2f8;line-height:1;pointer-events:none;user-select:none;">✦</div>
      <div style="position:absolute;inset:36px 70px;display:flex;flex-direction:column;align-items:flex-start;justify-content:center;">
        <div style="position:absolute;left:0;top:10px;bottom:10px;width:4px;background:linear-gradient(to bottom,#5b6af0,#818cf8);border-radius:2px;"></div>
        <div style="padding-left:20px;width:100%;">
          <div style="font-size:11px;letter-spacing:.24em;text-transform:uppercase;color:#5b6af0;font-weight:700;margin-bottom:12px;">${cfg.title}</div>
          ${cfg.showSchool && student.school ? `<div style="font-size:12px;color:#94a3b8;letter-spacing:.1em;text-transform:uppercase;margin-bottom:8px;">${student.school}</div>` : ''}
          <div style="font-size:14px;color:#94a3b8;margin-bottom:8px;">${cfg.subtitle}</div>
          <div style="font-size:60px;font-weight:900;color:#0f172a;line-height:1;letter-spacing:-.02em;max-width:700px;word-break:break-word;margin-bottom:6px;">${student.name || 'Student Name'}</div>
          <div style="width:60px;height:3px;background:#5b6af0;border-radius:2px;margin-bottom:16px;"></div>
          <div style="font-size:15px;color:#64748b;margin-bottom:6px;">${cfg.body}</div>
          ${cfg.showSubject && student.subject ? `<div style="font-size:22px;font-weight:700;color:#0f172a;margin-bottom:4px;">${student.subject}</div>` : ''}
          ${cfg.footer ? `<div style="font-size:11px;color:#94a3b8;margin-top:10px;font-style:italic;">${cfg.footer}</div>` : ''}
          ${fields.length ? `<div style="display:flex;gap:32px;margin-top:24px;padding-top:16px;border-top:1px solid #e2e8f0;">${fields.map(f=>`<div><div style="font-size:9px;letter-spacing:.16em;text-transform:uppercase;color:#94a3b8;font-weight:700;">${f.l}</div><div style="font-size:14px;font-weight:700;color:#1e293b;margin-top:3px;">${f.v}</div></div>`).join('')}</div>` : ''}
        </div>
      </div>
      ${logoOverlay()}
    </div>
  `);
}

/* ── Academic ── */
function renderAcademic(cfg, student) {
  const fields = buildBottomFields(cfg, student);
  const initials = (student.school || 'A').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return htmlEl(`
    <div style="width:${CERT_W}px;height:${CERT_H}px;position:relative;overflow:hidden;background:linear-gradient(170deg,#f5f0e8 0%,#ede5d0 100%);font-family:'Georgia',serif;box-sizing:border-box;">
      <div style="position:absolute;inset:13px;border:3px double #2d6a4f;box-sizing:border-box;pointer-events:none;"></div>
      <div style="position:absolute;inset:24px;border:1px solid #2d6a4f55;box-sizing:border-box;pointer-events:none;"></div>
      <div style="position:absolute;top:6px;left:6px;font-size:26px;color:#2d6a4f;line-height:1;">❧</div>
      <div style="position:absolute;top:6px;right:6px;font-size:26px;color:#2d6a4f;line-height:1;transform:scaleX(-1);">❧</div>
      <div style="position:absolute;bottom:6px;left:6px;font-size:26px;color:#2d6a4f;line-height:1;transform:scaleY(-1);">❧</div>
      <div style="position:absolute;bottom:6px;right:6px;font-size:26px;color:#2d6a4f;line-height:1;transform:scale(-1,-1);">❧</div>
      <div style="position:absolute;inset:36px 70px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;">
        <div style="margin-bottom:12px;width:80px;height:80px;border-radius:50%;border:3px solid #2d6a4f;box-shadow:0 0 0 3px #f5f0e8,0 0 0 5px #2d6a4f55;display:flex;align-items:center;justify-content:center;background:radial-gradient(circle at 40% 38%,#e8f5e9,#c8e6c9);">
          <span style="font-size:24px;font-weight:900;color:#1b4332;font-family:Georgia,serif;">${initials}</span>
        </div>
        <div style="font-size:34px;font-weight:700;color:#1b4332;letter-spacing:.02em;line-height:1.2;">${cfg.title}</div>
        <div style="display:flex;align-items:center;gap:10px;width:60%;margin:10px 0;"><div style="flex:1;height:2px;background:linear-gradient(to right,transparent,#2d6a4f);"></div><span style="font-size:12px;color:#2d6a4f;">✦</span><div style="flex:1;height:2px;background:linear-gradient(to left,transparent,#2d6a4f);"></div></div>
        ${cfg.showSchool && student.school ? `<div style="font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:#2d6a4f;margin-bottom:6px;opacity:.85;">${student.school}</div>` : ''}
        <div style="font-size:14px;color:#3d2b1f;letter-spacing:.1em;text-transform:uppercase;opacity:.8;margin-top:6px;">${cfg.subtitle}</div>
        <div style="font-size:48px;font-style:italic;font-weight:700;color:#1b4332;margin:8px 0 2px;line-height:1.2;max-width:720px;word-break:break-word;">${student.name || 'Student Name'}</div>
        <div style="font-size:14px;color:#3d2b1f;margin-top:6px;opacity:.85;">${cfg.body}</div>
        ${cfg.showSubject && student.subject ? `<div style="font-size:24px;font-weight:700;color:#2d6a4f;margin-top:8px;">${student.subject}</div>` : ''}
        ${cfg.footer ? `<div style="font-size:11px;color:#3d2b1f;opacity:.55;margin-top:10px;font-style:italic;">${cfg.footer}</div>` : ''}
        ${fields.length ? `<div style="display:flex;justify-content:space-around;align-items:center;width:85%;margin-top:18px;padding-top:12px;border-top:2px double #2d6a4f50;gap:12px;">${fields.map((f,i)=>`${i>0?`<div style="width:1px;height:36px;background:#2d6a4f30;"></div>`:''}<div style="text-align:center;"><div style="font-size:9px;letter-spacing:.14em;text-transform:uppercase;color:#2d6a4f;opacity:.75;">${f.l}</div><div style="font-size:14px;font-weight:700;color:#1b4332;margin-top:4px;padding-top:4px;border-top:1px solid #2d6a4f40;">${f.v}</div></div>`).join('')}</div>` : ''}
      </div>
      ${logoOverlay()}
    </div>
  `);
}

/* ── Royal Purple ── */
function renderRoyalPurple(cfg, student) {
  const fields = buildBottomFields(cfg, student);
  return htmlEl(`
    <div style="width:${CERT_W}px;height:${CERT_H}px;position:relative;overflow:hidden;background:linear-gradient(145deg,#1e0a4a 0%,#2d1b69 35%,#3b1f7a 60%,#1e0a4a 100%);font-family:'Playfair Display',Georgia,serif;box-sizing:border-box;">
      <div style="position:absolute;inset:12px;border:2px solid #a78bfa;box-sizing:border-box;pointer-events:none;opacity:.8;"></div>
      <div style="position:absolute;inset:20px;border:1px solid #7c3aed50;box-sizing:border-box;pointer-events:none;"></div>
      <div style="position:absolute;top:4px;left:4px;font-size:36px;color:#a78bfa;line-height:1;opacity:.9;">✦</div>
      <div style="position:absolute;top:4px;right:4px;font-size:36px;color:#a78bfa;line-height:1;opacity:.9;">✦</div>
      <div style="position:absolute;bottom:4px;left:4px;font-size:36px;color:#a78bfa;line-height:1;opacity:.9;">✦</div>
      <div style="position:absolute;bottom:4px;right:4px;font-size:36px;color:#a78bfa;line-height:1;opacity:.9;">✦</div>
      <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:700px;height:500px;border-radius:50%;background:radial-gradient(ellipse,rgba(167,139,250,.1) 0%,transparent 70%);pointer-events:none;"></div>
      <div style="position:absolute;inset:44px 72px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;">
        <div style="display:flex;align-items:center;gap:12px;width:68%;margin-bottom:16px;"><div style="flex:1;height:1px;background:linear-gradient(to right,transparent,#a78bfa);"></div><span style="font-size:11px;color:#a78bfa;letter-spacing:10px;">✦ ✦ ✦</span><div style="flex:1;height:1px;background:linear-gradient(to left,transparent,#a78bfa);"></div></div>
        <div style="font-size:36px;font-weight:700;color:#e9d5ff;letter-spacing:.04em;line-height:1.2;text-shadow:0 2px 20px rgba(167,139,250,.4);">${cfg.title}</div>
        ${cfg.showSchool && student.school ? `<div style="font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:#a78bfa;opacity:.85;margin-top:8px;">${student.school}</div>` : ''}
        <div style="font-size:13px;letter-spacing:.14em;text-transform:uppercase;color:#ddd6fe;opacity:.7;margin-top:16px;">${cfg.subtitle}</div>
        <div style="font-size:52px;font-style:italic;font-weight:700;color:#faf5ff;margin:10px 0 4px;line-height:1.15;max-width:740px;word-break:break-word;text-shadow:0 2px 24px rgba(167,139,250,.5);">${student.name || 'Student Name'}</div>
        <div style="display:flex;align-items:center;gap:12px;width:50%;margin:8px 0;"><div style="flex:1;height:1px;background:#a78bfa;opacity:.5;"></div><span style="font-size:16px;color:#a78bfa;">◆</span><div style="flex:1;height:1px;background:#a78bfa;opacity:.5;"></div></div>
        <div style="font-size:15px;color:#ddd6fe;opacity:.8;margin-top:2px;">${cfg.body}</div>
        ${cfg.showSubject && student.subject ? `<div style="font-size:26px;font-weight:700;color:#e9d5ff;margin-top:8px;">${student.subject}</div>` : ''}
        ${cfg.footer ? `<div style="font-size:11px;color:#ddd6fe;opacity:.45;margin-top:12px;font-style:italic;max-width:500px;">${cfg.footer}</div>` : ''}
        ${fields.length ? `<div style="display:flex;justify-content:space-around;align-items:center;width:88%;margin-top:22px;padding-top:14px;border-top:1px solid #a78bfa30;gap:12px;">${fields.map((f,i)=>`${i>0?`<div style="width:1px;height:36px;background:#a78bfa25;"></div>`:''}<div style="text-align:center;"><div style="font-size:9px;letter-spacing:.16em;text-transform:uppercase;color:#a78bfa;opacity:.75;">${f.l}</div><div style="font-size:13px;font-weight:600;color:#e9d5ff;margin-top:4px;">${f.v}</div></div>`).join('')}</div>` : ''}
      </div>
      ${logoOverlay()}
    </div>
  `);
}

/* ── Designer / Custom Template Renderer ── */
function renderFromConfig(cfg, student) {
  const fields = buildBottomFields(cfg, student);

  // Background
  const bgStyle = cfg.bgGradient
    ? `background:linear-gradient(135deg,${cfg.bg} 0%,${cfg.bg2} 100%)`
    : `background:${cfg.bg}`;

  // Border
  const borderMap = { single:`border:2px solid ${cfg.borderColor}`, double:`border:3px double ${cfg.borderColor}`, thick:`border:5px solid ${cfg.borderColor}`, dashed:`border:2px dashed ${cfg.borderColor}` };
  const borderCSS = cfg.border ? (borderMap[cfg.borderStyle] || borderMap.single) : '';

  // Text sizes
  const titleSize = cfg.titleSize || 36;
  const nameSize  = cfg.nameSize  || 50;
  const bodySize  = cfg.bodySize  || 14;
  const subjSize  = Math.round(nameSize * 0.5);

  // Name style
  const nameStyle = `font-style:${cfg.nameItalic ? 'italic' : 'normal'};font-weight:${cfg.nameBold ? '700' : '400'}`;
  const nameColor = (cfg.nameColorEnabled && cfg.nameColor) ? cfg.nameColor : cfg.accentColor;

  // Padding
  const pad = cfg.padding || 56;

  // Corner ornaments
  let corners = '';
  if (cfg.cornerStyle === 'brackets') {
    corners = `
      <div style="position:absolute;top:8px;left:8px;width:44px;height:44px;border-top:3px solid ${cfg.borderColor};border-left:3px solid ${cfg.borderColor};pointer-events:none;"></div>
      <div style="position:absolute;top:8px;right:8px;width:44px;height:44px;border-top:3px solid ${cfg.borderColor};border-right:3px solid ${cfg.borderColor};pointer-events:none;"></div>
      <div style="position:absolute;bottom:8px;left:8px;width:44px;height:44px;border-bottom:3px solid ${cfg.borderColor};border-left:3px solid ${cfg.borderColor};pointer-events:none;"></div>
      <div style="position:absolute;bottom:8px;right:8px;width:44px;height:44px;border-bottom:3px solid ${cfg.borderColor};border-right:3px solid ${cfg.borderColor};pointer-events:none;"></div>`;
  } else if (cfg.cornerStyle === 'stars') {
    corners = ['top:7px;left:7px','top:7px;right:7px','bottom:7px;left:7px','bottom:7px;right:7px']
      .map(p => `<div style="position:absolute;${p};font-size:28px;color:${cfg.borderColor};line-height:1;">✦</div>`).join('');
  } else if (cfg.cornerStyle === 'flourishes') {
    const t = [[`top:6px;left:6px`,``],[`top:6px;right:6px`,`transform:scaleX(-1)`],[`bottom:6px;left:6px`,`transform:scaleY(-1)`],[`bottom:6px;right:6px`,`transform:scale(-1,-1)`]];
    corners = t.map(([p,tr]) => `<div style="position:absolute;${p};font-size:26px;color:${cfg.borderColor};line-height:1;${tr}">❧</div>`).join('');
  }

  // Top/bottom accent lines
  const topLine = cfg.showTopLine !== false ? `
    <div style="display:flex;align-items:center;gap:12px;width:70%;margin-bottom:14px;">
      <div style="flex:1;height:1px;background:linear-gradient(to right,transparent,${cfg.dividerColor});"></div>
      <span style="font-size:13px;color:${cfg.dividerColor};">✦</span>
      <div style="flex:1;height:1px;background:linear-gradient(to left,transparent,${cfg.dividerColor});"></div>
    </div>` : '';

  // Seal
  const sealEl = cfg.showSeal ? `
    <div style="flex-shrink:0;width:72px;height:72px;border-radius:50%;
      background:radial-gradient(circle at 38% 35%,${lighten(cfg.sealColor||'#c9a84c')},${cfg.sealColor||'#c9a84c'});
      box-shadow:0 0 0 2.5px ${cfg.sealColor||'#c9a84c'},0 0 0 5px ${cfg.bg||'#fff'},0 0 0 7px ${(cfg.sealColor||'#c9a84c')+'50'};
      display:flex;align-items:center;justify-content:center;">
      <span style="font-size:30px;color:#fff;text-shadow:0 1px 4px rgba(0,0,0,.4);">${cfg.sealSymbol||'★'}</span>
    </div>` : '';

  const hasBottomContent = fields.length > 0 || cfg.showSeal;

  // ── RTL / Arabic handling ──
  // Arabic letters connect, so letter-spacing & uppercase must be disabled.
  // Auto-detect Arabic so the Designer & custom templates work without a manual flag.
  const arabicText = /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/.test(`${cfg.title}${cfg.subtitle}${cfg.body}${cfg.footer}`);
  const rtl = cfg.rtl || cfg.font === 'Cairo' || arabicText;
  const ls  = (val) => rtl ? '' : `letter-spacing:${val};`;
  const upper = rtl ? '' : 'text-transform:uppercase;';
  const dir = rtl ? 'direction:rtl;' : '';
  // Arabic looks better upright (not italic) for names
  const nameItalicStyle = (rtl && cfg.nameItalic) ? 'font-style:normal' : `font-style:${cfg.nameItalic ? 'italic' : 'normal'}`;
  const nameStyleRtl = `${nameItalicStyle};font-weight:${cfg.nameBold ? '700' : '400'}`;

  return htmlEl(`
    <div style="width:${CERT_W}px;height:${CERT_H}px;position:relative;overflow:hidden;${bgStyle};font-family:'${cfg.font}',serif;box-sizing:border-box;${dir}">
      ${cfg.border ? `<div style="position:absolute;inset:14px;${borderCSS};box-sizing:border-box;pointer-events:none;"></div>` : ''}
      ${cfg.border && cfg.borderStyle === 'double' ? `<div style="position:absolute;inset:24px;border:1px solid ${cfg.borderColor}50;box-sizing:border-box;pointer-events:none;"></div>` : ''}
      ${corners}

      <div style="position:absolute;inset:${pad}px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;">
        ${topLine}

        <div style="font-size:${titleSize}px;font-weight:700;color:${cfg.accentColor};line-height:1.3;${ls('.01em')}">${cfg.title}</div>

        ${cfg.showSchool && student.school ? `<div style="font-size:13px;${ls('.16em')}${upper}color:${cfg.accentColor};opacity:.8;margin-top:7px;">${student.school}</div>` : ''}

        <div style="font-size:${bodySize}px;color:${cfg.textColor};${ls('.1em')}${upper}margin-top:16px;opacity:.8;">${cfg.subtitle}</div>

        <div style="font-size:${nameSize}px;${nameStyleRtl};color:${nameColor};margin:9px 0 2px;line-height:1.3;max-width:760px;word-break:break-word;">${student.name || 'Student Name'}</div>

        <div style="display:flex;align-items:center;gap:10px;width:52%;margin:8px 0;">
          <div style="flex:1;height:1px;background:${cfg.dividerColor};opacity:.5;"></div>
          <span style="font-size:12px;color:${cfg.dividerColor};">◆ ◆ ◆</span>
          <div style="flex:1;height:1px;background:${cfg.dividerColor};opacity:.5;"></div>
        </div>

        <div style="font-size:${bodySize}px;color:${cfg.textColor};${ls('.06em')}">${cfg.body}</div>

        ${cfg.showSubject && student.subject ? `<div style="font-size:${subjSize}px;font-weight:700;color:${cfg.accentColor};margin-top:8px;line-height:1.3;">${student.subject}</div>` : ''}

        ${cfg.footer ? `<div style="font-size:12px;color:${cfg.textColor};opacity:.6;margin-top:12px;${rtl ? '' : 'font-style:italic;'}max-width:560px;line-height:1.6;">${cfg.footer}</div>` : ''}

        ${hasBottomContent ? `
          <div style="display:flex;align-items:center;justify-content:space-around;width:88%;margin-top:20px;padding-top:13px;border-top:1px solid ${cfg.dividerColor}40;gap:16px;">
            ${sealEl}
            ${fields.map((f, i) => `
              ${i > 0 || cfg.showSeal ? `<div style="width:1px;height:34px;background:${cfg.dividerColor}30;"></div>` : ''}
              <div style="text-align:center;">
                <div style="font-size:10px;${ls('.14em')}${upper}color:${cfg.accentColor};opacity:.7;">${f.l}</div>
                <div style="font-size:14px;font-weight:600;color:${cfg.accentColor};margin-top:3px;">${f.v}</div>
              </div>
            `).join('')}
          </div>
        ` : ''}
      </div>
      ${logoOverlay()}
    </div>
  `);
}

/* ================================================================
   UTILITIES
================================================================ */
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2); }

function formatDate(str) {
  if (!str) return '';
  const d = new Date(str + 'T00:00:00');
  if (state.lang === 'ar') {
    try { return new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura-nu-arab', { day: 'numeric', month: 'long', year: 'numeric' }).format(d); } catch (e) {}
  }
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

let _toastTimer;
function toast(msg, type = 'info') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = `toast ${type} show`;
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.remove('show'), 3200);
}

function esc(str) {
  return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* Built-in templates shown in the gallery: only those for the current language */
function getBuiltInsForLang(lang) { return BUILT_IN.filter(tpl => tpl.lang === lang); }
/* Gallery list = language-matched built-ins + the user's custom templates */
function getAllTemplates() { return [...getBuiltInsForLang(state.lang), ...state.customTemplates]; }
/* Lookup by id searches ALL templates (any language) + custom — used by preview/export */
function getTemplate(id) {
  return [...BUILT_IN, ...state.customTemplates].find(t => t.id === id) || getBuiltInsForLang(state.lang)[0] || BUILT_IN[0];
}
/* Default built-in for the current language (first = attendance) */
function defaultTemplateId() { return (getBuiltInsForLang(state.lang)[0] || BUILT_IN[0]).id; }

function saveState() {
  const { logo, bgImage, ...rest } = state;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      students: rest.students,
      customTemplates: rest.customTemplates,
      selectedTemplateId: rest.selectedTemplateId,
      currentTab: rest.currentTab,
      logoPosition: rest.logoPosition,
      logoSize: rest.logoSize,
      bgImageOpacity: rest.bgImageOpacity,
      bgImageFit: rest.bgImageFit,
      lang: rest.lang,
      draft: rest.draft,
    }));
    if (logo) localStorage.setItem(STORAGE_KEY + '_logo', logo);
    else localStorage.removeItem(STORAGE_KEY + '_logo');
    if (bgImage) localStorage.setItem(STORAGE_KEY + '_bgimg', bgImage);
    else localStorage.removeItem(STORAGE_KEY + '_bgimg');
  } catch (e) { /* storage full */ }
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const s = JSON.parse(raw);
      if (s.students) state.students = s.students;
      if (s.customTemplates) state.customTemplates = s.customTemplates;
      if (s.selectedTemplateId) state.selectedTemplateId = s.selectedTemplateId;
      if (s.currentTab) state.currentTab = s.currentTab;
      if (s.logoPosition) state.logoPosition = s.logoPosition;
      if (s.logoSize) state.logoSize = s.logoSize;
      if (s.bgImageOpacity != null) state.bgImageOpacity = s.bgImageOpacity;
      if (s.bgImageFit) state.bgImageFit = s.bgImageFit;
      if (s.lang) state.lang = s.lang;
      if (s.draft) state.draft = s.draft;
    }
    state.logo = localStorage.getItem(STORAGE_KEY + '_logo') || null;
    state.bgImage = localStorage.getItem(STORAGE_KEY + '_bgimg') || null;
  } catch (e) { /* ignore */ }
}

/* ================================================================
   I18N — apply translations to DOM
================================================================ */
function applyLanguage(lang) {
  state.lang = lang;
  const dict = I18N[lang] || I18N.en;

  // Keep the selection valid for this language: if a built-in of the other
  // language was selected, switch to the same category in the new language.
  const sel = [...BUILT_IN, ...state.customTemplates].find(tp => tp.id === state.selectedTemplateId);
  if (sel && !sel.custom && sel.lang && sel.lang !== lang) {
    const match = BUILT_IN.find(tp => tp.lang === lang && tp.category === sel.category);
    state.selectedTemplateId = match ? match.id : (getBuiltInsForLang(lang)[0] || BUILT_IN[0]).id;
    const editable = getTemplate(state.selectedTemplateId);
    if (editable && editable.renderer === 'designer') loadTemplateIntoDesigner(editable);
  }

  // document direction
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';

  // text content
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (dict[key] != null) el.textContent = dict[key];
  });

  // placeholders
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (dict[key] != null) el.placeholder = dict[key];
  });

  // <option> labels
  document.querySelectorAll('[data-i18n-opt]').forEach(el => {
    const key = el.getAttribute('data-i18n-opt');
    if (dict[key] != null) el.textContent = dict[key];
  });

  // title / tooltip attributes
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    const key = el.getAttribute('data-i18n-title');
    if (dict[key] != null) el.title = dict[key];
  });

  // lang toggle buttons
  document.querySelectorAll('.lang-btn[data-lang]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === lang);
  });

  // re-render dynamic content that contains translated strings
  renderTemplateCards();
  renderNamesTable(document.getElementById('searchStudents')?.value.toLowerCase() || '');
  updateMainPreview();

  saveState();
}

function initLanguage() {
  document.querySelectorAll('.lang-btn[data-lang]').forEach(btn => {
    btn.addEventListener('click', () => applyLanguage(btn.dataset.lang));
  });
  applyLanguage(state.lang);
}

/* ================================================================
   SIDE ACCORDION NAVIGATION
================================================================ */
/* Open one accordion section (single-open). `name` ∈ TABS */
function openAccordion(name, scrollTo = true) {
  if (!TABS.includes(name)) name = 'templates';
  state.currentTab = name;

  document.querySelectorAll('.acc-item[data-acc]').forEach(item => {
    item.classList.toggle('open', item.dataset.acc === name);
  });

  saveState();

  if (name === 'templates') renderTemplateCards();
  if (name === 'names')     renderNamesTable(document.getElementById('searchStudents')?.value.toLowerCase() || '');

  // The live preview reflects the active context (design edits vs selected template)
  updateMainPreview();
  setTimeout(scalePreview, 60);

  // Bring the opened section into view (esp. on mobile where it stacks).
  // Skipped on initial load to avoid an unexpected jump.
  if (scrollTo) {
    const item = document.querySelector(`.acc-item[data-acc="${name}"]`);
    if (item) setTimeout(() => item.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 80);
  }
}

// Backwards-compatible alias used elsewhere in the code
function showTab(name) { openAccordion(name); }

function initNavigation() {
  // Accordion headers
  document.querySelectorAll('.acc-item[data-acc] > .acc-head').forEach(head => {
    const item = head.closest('.acc-item');
    head.addEventListener('click', () => {
      // toggle: if already open, collapse; else open it (single-open)
      if (item.classList.contains('open')) {
        item.classList.remove('open');
      } else {
        openAccordion(item.dataset.acc);
      }
    });
  });
  // Other [data-acc] triggers (brand, "Create Custom" button, etc.)
  document.querySelectorAll('[data-acc]:not(.acc-item)').forEach(btn => {
    if (btn.classList.contains('acc-head')) return;
    btn.addEventListener('click', () => openAccordion(btn.dataset.acc));
  });
}

/* ── The working design (decorations from controls + editable elements) ── */
function workingCfg() {
  return { ...getDesignerCfg(), elements: state.elements };
}
/* Template used for preview & export = the live working design */
function getActiveTemplate() {
  return { renderer: 'designer', cfg: workingCfg() };
}

/* ── Sample student for the live preview ──
   - if there are entries → the first one
   - else → sample text overlaid with anything typed directly on the canvas (draft) */
function previewStudent() {
  if (state.students.length) return state.students[0];
  const dummy = { name: t('dummy_name'), school: t('dummy_school'), subject: t('dummy_subject'), grade: 'A+', instructor: t('dummy_instructor'), date: '2026-06-15' };
  return { ...dummy, ...(state.draft || {}) };
}

/* Set a data-field value typed on the canvas (updates first entry, or the draft).
   Date typed manually is stored as a free-text override (dateText). */
function setDataValue(role, value) {
  const key = role === 'date' ? 'dateText' : role;
  if (state.students.length) {
    state.students[0][key] = value;
    renderNamesTable(document.getElementById('searchStudents')?.value.toLowerCase() || '');
  } else {
    state.draft = state.draft || {};
    state.draft[key] = value;
  }
  saveState();
}

/* ── Render the persistent live preview (interactive editor) ── */
function updateMainPreview() {
  const el = document.getElementById('certPreview');
  if (!el) return;
  el.innerHTML = '';
  el.appendChild(renderCertificate(getActiveTemplate(), previewStudent(), true));
  const pc = document.getElementById('previewCount');
  if (pc) pc.textContent = state.students.length;
  attachElementEditing();
  // Always re-fit the certificate after (re)rendering so it shows fully
  requestAnimationFrame(scalePreview);
}

/* ================================================================
   ON-CANVAS TEXT EDITING
================================================================ */
function getEl(id) { return state.elements.find(e => e.id === id); }

function attachElementEditing() {
  const root = document.querySelector('#certPreview .cert-root');
  if (!root) return;
  root.querySelectorAll('.cel-i').forEach(node => {
    const id = node.dataset.id;
    let down = null, moved = false;

    node.addEventListener('pointerdown', (e) => {
      if (node.classList.contains('editing')) return; // editing → let caret work
      e.preventDefault();
      down = { x: e.clientX, y: e.clientY, sx: getEl(id).x, sy: getEl(id).y };
      moved = false;
      node.setPointerCapture(e.pointerId);
    });
    node.addEventListener('pointermove', (e) => {
      if (!down) return;
      const dx = e.clientX - down.x, dy = e.clientY - down.y;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) moved = true;
      const el = getEl(id);
      el.x = Math.max(2, Math.min(98, down.sx + (dx / previewScale) / CERT_W * 100));
      el.y = Math.max(3, Math.min(97, down.sy + (dy / previewScale) / CERT_H * 100));
      node.style.left = el.x + '%';
      node.style.top = el.y + '%';
      positionElToolbar(node);
    });
    node.addEventListener('pointerup', (e) => {
      if (!down) return;
      down = null;
      try { node.releasePointerCapture(e.pointerId); } catch (_) {}
      if (moved) { saveState(); pushHistory(true); return; }
      // A simple tap/click: select it, and for typeable text start typing right away
      selectElement(id);
      if (TYPEABLE_ROLES.includes(node.dataset.role)) beginInlineEdit(node);
    });
  });

  // click empty canvas → deselect
  root.addEventListener('pointerdown', (e) => {
    if (e.target === root) deselectElement();
  });

  // re-apply selection visual if one is selected
  if (state.selectedElId) {
    const sel = root.querySelector(`.cel-i[data-id="${state.selectedElId}"]`);
    if (sel) { sel.classList.add('sel'); positionElToolbar(sel); }
    else deselectElement();
  }
}

function selectElement(id) {
  state.selectedElId = id;
  document.querySelectorAll('#certPreview .cel-i').forEach(n => n.classList.toggle('sel', n.dataset.id === id));
  const node = document.querySelector(`#certPreview .cel-i[data-id="${id}"]`);
  if (node) showElToolbar(node);
}

function deselectElement() {
  state.selectedElId = null;
  document.querySelectorAll('#certPreview .cel-i').forEach(n => n.classList.remove('sel'));
  const tb = document.getElementById('celToolbar');
  if (tb) tb.style.display = 'none';
}

function beginInlineEdit(node) {
  const el = getEl(node.dataset.id);
  if (!el) return;
  // Edit only the value span (keeps the small field label intact)
  const target = node.querySelector('.cel-val') || node;
  // If the value span only holds a faded placeholder, start from empty
  if (target.querySelector('span[style*="opacity"]')) target.textContent = '';
  target.contentEditable = 'true';
  node.classList.add('editing');
  target.focus();
  const range = document.createRange(); range.selectNodeContents(target);
  const seln = window.getSelection(); seln.removeAllRanges(); seln.addRange(range);

  const finish = () => {
    target.contentEditable = 'false';
    node.classList.remove('editing');
    const value = target.textContent.trim();
    target.removeEventListener('blur', finish);
    if (DATA_ROLES.includes(el.role)) {
      setDataValue(el.role, value);          // name/school/subject/date/grade/instructor
    } else {
      el.text = value;                       // title/subtitle/body/footer/custom
      syncElementToControl(el);
    }
    saveState();
    pushHistory(true);
    updateMainPreview();
    selectElement(el.id);
  };
  target.addEventListener('blur', finish);
  target.addEventListener('keydown', (ev) => {
    if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); target.blur(); }
  });
}

/* Floating element toolbar (size / color / bold / italic / edit / delete) */
const FONTS_AR = ['Cairo','Tajawal','Almarai','Amiri','Aref Ruqaa','El Messiri','Reem Kufi','Markazi Text','Changa','Scheherazade New','Lateef'];
const FONTS_EN = ['Playfair Display','Cormorant Garamond','Cinzel','EB Garamond','Libre Baskerville','Merriweather','Marcellus','Montserrat','Poppins','Raleway','Oswald','Lato','Inter','Great Vibes','Pinyon Script','Dancing Script','Pacifico','Georgia, serif'];
const FONT_CHOICES = [...FONTS_AR, ...FONTS_EN];

function ensureElToolbar() {
  let tb = document.getElementById('celToolbar');
  if (tb) return tb;
  tb = document.createElement('div');
  tb.id = 'celToolbar';
  tb.className = 'cel-toolbar';
  const optList = (arr) => arr.map(f => `<option value="${f}">${f.replace(', serif','')}</option>`).join('');
  const fontOpts = `<optgroup label="عربي">${optList(FONTS_AR)}</optgroup><optgroup label="English">${optList(FONTS_EN)}</optgroup>`;
  tb.innerHTML = `
    <select class="cel-font" id="celFont" title="Font">${fontOpts}</select>
    <span class="cel-sep"></span>
    <button data-act="size-" title="−"><i class="fas fa-minus"></i></button>
    <span class="cel-size" id="celSizeVal">0</span>
    <button data-act="size+" title="+"><i class="fas fa-plus"></i></button>
    <span class="cel-sep"></span>
    <label class="cel-color"><input type="color" id="celColor"><i class="fas fa-fill-drip"></i></label>
    <button data-act="bold" title="Bold"><i class="fas fa-bold"></i></button>
    <button data-act="italic" title="Italic"><i class="fas fa-italic"></i></button>
    <button data-act="edit" title="${t('el_edit')}"><i class="fas fa-pen"></i></button>
    <button data-act="del" class="cel-del" title="${t('el_delete')}"><i class="fas fa-trash"></i></button>
  `;
  document.body.appendChild(tb);

  tb.addEventListener('click', (e) => {
    const btn = e.target.closest('button'); if (!btn) return;
    const el = getEl(state.selectedElId); if (!el) return;
    const act = btn.dataset.act;
    if (act === 'size-') el.size = Math.max(8, el.size - 2);
    if (act === 'size+') el.size = Math.min(120, el.size + 2);
    if (act === 'bold') el.weight = el.weight >= 700 ? 400 : 700;
    if (act === 'italic') el.italic = !el.italic;
    if (act === 'del') { state.elements = state.elements.filter(x => x.id !== el.id); state.selectedElId = null; saveState(); pushHistory(true); updateMainPreview(); return; }
    if (act === 'edit') {
      const node = document.querySelector(`#certPreview .cel-i[data-id="${el.id}"]`);
      if (node && TYPEABLE_ROLES.includes(el.role)) beginInlineEdit(node);
      return;
    }
    saveState(); pushHistory(true); updateMainPreview(); selectElement(el.id);
  });
  tb.querySelector('#celColor').addEventListener('input', (e) => {
    const el = getEl(state.selectedElId); if (!el) return;
    el.color = e.target.value; saveState(); pushHistory();
    const node = document.querySelector(`#certPreview .cel-i[data-id="${el.id}"]`);
    if (node) node.style.color = el.color;
  });
  tb.querySelector('#celFont').addEventListener('change', (e) => {
    const el = getEl(state.selectedElId); if (!el) return;
    el.font = e.target.value; saveState(); pushHistory(true); updateMainPreview(); selectElement(el.id);
  });
  // keep clicks inside the toolbar from deselecting
  tb.addEventListener('pointerdown', (e) => e.stopPropagation());
  return tb;
}

function showElToolbar(node) {
  const el = getEl(node.dataset.id); if (!el) return;
  const tb = ensureElToolbar();
  tb.style.display = 'flex';
  tb.querySelector('#celSizeVal').textContent = el.size;
  tb.querySelector('#celColor').value = el.color.startsWith('#') ? el.color : '#000000';
  tb.querySelector('#celFont').value = el.font || getDesignerCfg().font || 'Cairo';
  tb.querySelector('[data-act="bold"]').classList.toggle('on', el.weight >= 700);
  tb.querySelector('[data-act="italic"]').classList.toggle('on', !!el.italic);
  // show edit (pen) for any typeable text, delete only for custom-added text
  tb.querySelector('[data-act="edit"]').style.display = TYPEABLE_ROLES.includes(el.role) ? '' : 'none';
  tb.querySelector('[data-act="del"]').style.display = el.role === 'custom' ? '' : 'none';
  positionElToolbar(node);
}

function positionElToolbar(node) {
  const tb = document.getElementById('celToolbar');
  if (!tb || tb.style.display === 'none') return;
  const r = node.getBoundingClientRect();
  const tbw = tb.offsetWidth || 240;
  let left = r.left + r.width / 2 - tbw / 2;
  left = Math.max(8, Math.min(window.innerWidth - tbw - 8, left));
  let top = r.top - tb.offsetHeight - 10;
  if (top < (window.innerWidth <= 768 ? 8 : 70)) top = r.bottom + 10; // flip below if no room
  tb.style.left = left + 'px';
  tb.style.top = top + 'px';
}

/* Keep the text-content control inputs in sync with edited elements */
function syncElementToControl(el) {
  const map = { title: 'certTitle', subtitle: 'certSubtitle', body: 'certBody', footer: 'certFooter' };
  const id = map[el.role];
  if (id) { const inp = document.getElementById(id); if (inp) inp.value = el.text; }
}

/* Update the text of the element with a given role (from control inputs) */
function setElementText(role, text) {
  let el = state.elements.find(e => e.role === role);
  if (text && text.trim()) {
    if (!el) {
      // (re)create footer/body if it was removed
      el = { id: uid(), role, text: '', x: 50, y: role === 'footer' ? 75 : 36, size: role === 'title' ? 40 : 15, color: '#333', weight: role === 'title' ? 700 : 400, italic: false, align: 'center' };
      state.elements.push(el);
    }
    el.text = text;
  } else if (el && (role === 'footer')) {
    // empty footer → remove
    state.elements = state.elements.filter(e => e !== el);
  } else if (el) {
    el.text = text;
  }
}

/* Add or remove a data-field element (school/subject/date/grade/instructor) */
function toggleFieldElement(role, on) {
  const exists = state.elements.find(e => e.role === role);
  if (on && !exists) {
    const cfg = getDesignerCfg();
    const isBottom = ['date', 'grade', 'instructor'].includes(role);
    state.elements.push({ id: uid(), role,
      x: 50, y: isBottom ? 88 : (role === 'school' ? 28 : 66),
      size: isBottom ? 15 : (role === 'subject' ? 26 : 15),
      color: cfg.accentColor || '#1e293b', weight: role === 'subject' ? 700 : 600, italic: false, align: 'center' });
  } else if (!on && exists) {
    state.elements = state.elements.filter(e => e.role !== role);
    if (state.selectedElId === exists.id) state.selectedElId = null;
  }
}

/* Add a new free custom text element at the centre */
function addTextElement() {
  const cfg = getDesignerCfg();
  const el = { id: uid(), role: 'custom', text: t('new_text'), x: 50, y: 50, size: 28, color: cfg.accentColor || '#1e293b', weight: 600, italic: false, align: 'center' };
  state.elements.push(el);
  saveState();
  pushHistory(true);
  updateMainPreview();
  selectElement(el.id);
  const node = document.querySelector(`#certPreview .cel-i[data-id="${el.id}"]`);
  if (node) beginInlineEdit(node);
}

/* ================================================================
   TEMPLATES SECTION
================================================================ */
function renderTemplateCards() {
  const grid = document.getElementById('templatesGrid');
  grid.innerHTML = '';
  const dummy = { name: t('dummy_name'), school: t('dummy_school'), subject: t('dummy_subject'), grade: 'A+', instructor: t('dummy_instructor'), date: '2026-06-15' };

  getAllTemplates().forEach(tpl => {
    const selected = tpl.id === state.selectedTemplateId;
    const tplName = tpl.nameKey ? t(tpl.nameKey) : tpl.name;
    const tplDesc = tpl.descKey ? t(tpl.descKey) : (tpl.description || '');

    const card = document.createElement('div');
    card.className = `tpl-card${selected ? ' selected' : ''}${tpl.isBlank ? ' tpl-blank' : ''}`;
    card.dataset.id = tpl.id;

    /* Preview */
    const preview = document.createElement('div');
    preview.className = 'tpl-preview';
    const inner = document.createElement('div');
    inner.className = 'tpl-preview-inner';
    inner.appendChild(renderCertificate(tpl, dummy));
    preview.appendChild(inner);

    /* Blank canvas badge */
    if (tpl.isBlank) {
      const blankBadge = document.createElement('div');
      blankBadge.className = 'tpl-blank-badge';
      blankBadge.innerHTML = `<i class="fas fa-pen"></i> ${t('blank_name')}`;
      preview.appendChild(blankBadge);
    }

    /* Label */
    const label = document.createElement('div');
    label.className = 'tpl-label';
    const nameEl = document.createElement('div');
    nameEl.className = 'tpl-lname';
    nameEl.textContent = tplName;
    if (tpl.custom) { const tag = document.createElement('span'); tag.className = 'tpl-custom-tag'; tag.textContent = t('custom'); nameEl.appendChild(tag); }
    const descEl = document.createElement('div');
    descEl.className = 'tpl-ldesc';
    descEl.textContent = tplDesc;
    label.appendChild(nameEl);
    label.appendChild(descEl);
    preview.appendChild(label);

    /* Hover layer */
    const hoverLayer = document.createElement('div');
    hoverLayer.className = 'tpl-hover-layer';
    const useBtn = document.createElement('button');
    useBtn.className = 'tpl-use-btn';
    useBtn.innerHTML = tpl.isBlank
      ? `<i class="fas fa-pen"></i> ${t('open_designer')}`
      : `<i class="fas fa-check"></i> ${t('use_template')}`;
    hoverLayer.appendChild(useBtn);
    preview.appendChild(hoverLayer);

    /* Selected badge */
    const checkBadge = document.createElement('div');
    checkBadge.className = 'tpl-check';
    checkBadge.innerHTML = `<i class="fas fa-check"></i> ${t('selected')}`;
    preview.appendChild(checkBadge);

    card.appendChild(preview);

    /* Custom template action bar */
    if (tpl.custom) {
      const bar = document.createElement('div');
      bar.className = 'tpl-custom-bar';
      const editBtn = document.createElement('button');
      editBtn.className = 'btn btn-ghost btn-sm';
      editBtn.style.flex = '1';
      editBtn.innerHTML = `<i class="fas fa-pen"></i> ${t('edit_in_designer')}`;
      const delBtn = document.createElement('button');
      delBtn.className = 'tpl-del-btn';
      delBtn.title = t('ctrl_remove');
      delBtn.innerHTML = '<i class="fas fa-trash"></i>';
      bar.appendChild(editBtn);
      bar.appendChild(delBtn);
      card.appendChild(bar);

      editBtn.addEventListener('click', (e) => { e.stopPropagation(); loadTemplateIntoDesigner(tpl); showTab('designer'); });
      delBtn.addEventListener('click', (e) => { e.stopPropagation(); deleteCustomTemplate(tpl.id); });
    }

    grid.appendChild(card);

    /* Scale inner */
    requestAnimationFrame(() => {
      const w = preview.offsetWidth;
      if (w) inner.style.transform = `scale(${w / CERT_W})`;
    });

    /* Click handlers */
    if (tpl.isBlank) {
      const openDesigner = () => { selectTemplate(tpl.id); loadTemplateIntoDesigner(tpl); showTab('designer'); };
      useBtn.addEventListener('click', (e) => { e.stopPropagation(); openDesigner(); });
      card.addEventListener('click', openDesigner);
    } else {
      useBtn.addEventListener('click', (e) => { e.stopPropagation(); selectTemplate(tpl.id); });
      card.addEventListener('click', () => selectTemplate(tpl.id));
    }
  });
}

function selectTemplate(id) {
  state.selectedTemplateId = id;
  const tpl = getTemplate(id);
  // Sync the Designer form so customizing continues from this template
  if (tpl && tpl.renderer === 'designer' && tpl.cfg) loadTemplateIntoDesigner(tpl);
  saveState();
  document.querySelectorAll('.tpl-card').forEach(c => c.classList.toggle('selected', c.dataset.id === id));
  updateMainPreview();
  setTimeout(scalePreview, 60);
  const nm = tpl.nameKey ? t(tpl.nameKey) : tpl.name;
  toast(`"${nm}" ${t('toast_selected')}`, 'success');
}

function deleteCustomTemplate(id) {
  if (!confirm(t('confirm_del_tpl'))) return;
  state.customTemplates = state.customTemplates.filter(c => c.id !== id);
  if (state.selectedTemplateId === id) state.selectedTemplateId = defaultTemplateId();
  saveState(); renderTemplateCards(); toast(t('toast_tpl_deleted'), 'info');
}

/* ================================================================
   DESIGNER SECTION
================================================================ */
const DESIGNER_DEFAULT = {
  bg: '#fef9ec', bgGradient: false, bg2: '#fffbe6',
  border: true, borderStyle: 'double', borderColor: '#c9a84c',
  font: 'Playfair Display', accentColor: '#8b6914', textColor: '#3d2b1f', dividerColor: '#c9a84c',
  title: 'Certificate of Achievement', subtitle: 'This is to certify that',
  body: 'has successfully completed', footer: 'In recognition of outstanding dedication and achievement',
  showSchool: true, showSubject: true, showGrade: true, showInstructor: true, showDate: true,
  titleSize: 36, nameSize: 50, bodySize: 14,
  nameItalic: true, nameBold: true, nameColorEnabled: false, nameColor: '#3d1a00',
  showSeal: false, sealColor: '#c9a84c', sealSymbol: '★',
  cornerStyle: 'none', showTopLine: true, padding: 56,
};

const BG_PRESETS = {
  cream:  { bg: '#fef9ec', bg2: '#fffbe6' },
  blue:   { bg: '#eff6ff', bg2: '#dbeafe' },
  green:  { bg: '#f0fdf4', bg2: '#dcfce7' },
  purple: { bg: '#faf5ff', bg2: '#f3e8ff' },
  dark:   { bg: '#0f1322', bg2: '#1a2040' },
};

function getDesignerCfg() {
  const v = (id) => { const e = document.getElementById(id); return e ? e.value : ''; };
  const c = (id) => { const e = document.getElementById(id); return e ? e.checked : false; };
  const n = (id) => { const e = document.getElementById(id); return e ? +e.value : 0; };
  return {
    bg: v('bgColor'), bgGradient: c('bgGradient'), bg2: v('bgColor2'),
    border: c('showBorder'), borderStyle: v('borderStyle'), borderColor: v('borderColor'),
    font: v('primaryFont'), accentColor: v('accentColor'), textColor: v('textColor'), dividerColor: v('dividerColor'),
    title: v('certTitle'), subtitle: v('certSubtitle'), body: v('certBody'), footer: v('certFooter'),
    showSchool: c('showSchool'), showSubject: c('showSubject'), showGrade: c('showGrade'),
    showInstructor: c('showInstructor'), showDate: c('showDate'),
    titleSize: n('titleSize') || 36, nameSize: n('nameSize') || 50, bodySize: n('bodySize') || 14,
    nameItalic: c('nameItalic'), nameBold: c('nameBold'),
    nameColorEnabled: c('nameColorEnabled'), nameColor: v('nameColor'),
    showSeal: c('showSeal'), sealColor: v('sealColor'), sealSymbol: v('sealSymbol'),
    cornerStyle: v('cornerStyle'), showTopLine: c('showTopLine'), padding: 56,
  };
}

function setDesignerCfg(cfg) {
  const set = (id, val) => {
    const el = document.getElementById(id);
    if (!el) return;
    if (typeof val === 'boolean') el.checked = val;
    else el.value = val ?? '';
  };
  const setRange = (id, valId, val) => {
    set(id, val);
    const vEl = document.getElementById(valId);
    if (vEl) vEl.textContent = val || '';
  };

  set('bgColor', cfg.bg); set('bgGradient', cfg.bgGradient); set('bgColor2', cfg.bg2);
  set('showBorder', cfg.border); set('borderStyle', cfg.borderStyle); set('borderColor', cfg.borderColor);
  set('primaryFont', cfg.font); set('accentColor', cfg.accentColor); set('textColor', cfg.textColor); set('dividerColor', cfg.dividerColor);
  set('certTitle', cfg.title); set('certSubtitle', cfg.subtitle); set('certBody', cfg.body); set('certFooter', cfg.footer);
  set('showSchool', cfg.showSchool); set('showSubject', cfg.showSubject); set('showGrade', cfg.showGrade);
  set('showInstructor', cfg.showInstructor); set('showDate', cfg.showDate);
  setRange('titleSize', 'titleSizeVal', cfg.titleSize || 36);
  setRange('nameSize',  'nameSizeVal',  cfg.nameSize  || 50);
  setRange('bodySize',  'bodySizeVal',  cfg.bodySize  || 14);
  set('nameItalic', cfg.nameItalic !== false); set('nameBold', cfg.nameBold !== false);
  set('nameColorEnabled', cfg.nameColorEnabled || false); set('nameColor', cfg.nameColor || '#3d1a00');
  set('showSeal', cfg.showSeal || false); set('sealColor', cfg.sealColor || '#c9a84c'); set('sealSymbol', cfg.sealSymbol || '★');
  set('cornerStyle', cfg.cornerStyle || 'none'); set('showTopLine', cfg.showTopLine !== false);

  // Toggle visibility
  const bOpts = document.getElementById('borderOpts');
  const gradRow = document.getElementById('gradRow');
  const nameColorRow = document.getElementById('nameColorRow');
  const sealOpts = document.getElementById('sealOpts');
  if (bOpts) bOpts.style.display = cfg.border ? '' : 'none';
  if (gradRow) gradRow.style.display = cfg.bgGradient ? '' : 'none';
  if (nameColorRow) nameColorRow.style.display = cfg.nameColorEnabled ? '' : 'none';
  if (sealOpts) sealOpts.style.display = cfg.showSeal ? '' : 'none';
}

// Designer edits update the shared live preview
function updateDesignerPreview() { updateMainPreview(); }

function scalePreview() {
  const scaler = document.getElementById('canvasScaler');
  const wrapper = document.getElementById('certPreviewWrapper');
  const inner = document.getElementById('certPreview');
  if (!scaler || !wrapper || !inner) return;
  const PAD = 40;
  const availW = scaler.clientWidth - PAD;
  if (availW <= 0) { requestAnimationFrame(scalePreview); return; } // layout not ready yet → retry

  // Fit within the visible viewport height too, so the WHOLE certificate shows.
  const navH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-h')) || 62;
  const stacked = window.innerWidth <= 980;
  const availH = Math.max(160, stacked ? window.innerHeight * 0.46 : window.innerHeight - navH - 175);

  // Choose the wrapper WIDTH so the fixed 1056×816 aspect fits both width & height
  const ASPECT = CERT_W / CERT_H;            // 1.294 (landscape)
  let w = Math.min(availW, availH * ASPECT);
  w = Math.max(160, w);
  const scale = w / CERT_W;
  previewScale = scale;

  // aspect-ratio on the wrapper gives the correct height automatically
  wrapper.style.width = `${w}px`;
  inner.style.transform = `scale(${scale})`;
  scaler.style.height = `${(w / ASPECT) + PAD}px`;

  // keep the element toolbar aligned after a resize
  if (state.selectedElId) {
    const node = document.querySelector(`#certPreview .cel-i[data-id="${state.selectedElId}"]`);
    if (node) positionElToolbar(node);
  }
}

function loadTemplateIntoDesigner(tpl) {
  setDesignerCfg({ ...DESIGNER_DEFAULT, ...tpl.cfg });
  document.getElementById('templateName').value = tpl.custom ? tpl.name : (tpl.nameKey ? t(tpl.nameKey) : 'My Custom Template');
  // Build the editable element set for this template
  state.elements = buildElements(tpl.cfg);
  state.selectedElId = null;
  updateMainPreview();
  resetHistory();   // new baseline — nothing to undo before this
}

function initDesigner() {
  // All live-preview input IDs
  const liveIds = [
    'bgColor','bgColor2','bgGradient','showBorder','borderStyle','borderColor',
    'primaryFont','accentColor','textColor','dividerColor',
    'certTitle','certSubtitle','certBody','certFooter',
    'showSchool','showSubject','showGrade','showInstructor','showDate',
    'titleSize','nameSize','bodySize',
    'nameItalic','nameBold','nameColorEnabled','nameColor',
    'showSeal','sealColor','sealSymbol','cornerStyle','showTopLine',
  ];

  liveIds.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const update = () => {
      // Update range value displays
      if (id === 'titleSize') { const v = document.getElementById('titleSizeVal'); if (v) v.textContent = el.value; }
      if (id === 'nameSize')  { const v = document.getElementById('nameSizeVal');  if (v) v.textContent = el.value; }
      if (id === 'bodySize')  { const v = document.getElementById('bodySizeVal');  if (v) v.textContent = el.value; }
      // Toggle conditional rows
      if (id === 'showBorder')      { const d = document.getElementById('borderOpts');   if (d) d.style.display = el.checked ? '' : 'none'; }
      if (id === 'bgGradient')      { const d = document.getElementById('gradRow');       if (d) d.style.display = el.checked ? '' : 'none'; }
      if (id === 'nameColorEnabled'){ const d = document.getElementById('nameColorRow'); if (d) d.style.display = el.checked ? '' : 'none'; }
      if (id === 'showSeal')        { const d = document.getElementById('sealOpts');     if (d) d.style.display = el.checked ? '' : 'none'; }

      // Sync text-content inputs → their elements
      const textMap = { certTitle: 'title', certSubtitle: 'subtitle', certBody: 'body', certFooter: 'footer' };
      if (textMap[id]) setElementText(textMap[id], el.value);

      // Visible-field toggles → add / remove the data element
      const fieldMap = { showSchool: 'school', showSubject: 'subject', showGrade: 'grade', showInstructor: 'instructor', showDate: 'date' };
      if (fieldMap[id]) toggleFieldElement(fieldMap[id], el.checked);

      updateDesignerPreview();
      pushHistory();
    };
    el.addEventListener('input', update);
    el.addEventListener('change', update);
  });

  // Background preset
  document.getElementById('bgPreset').addEventListener('change', (e) => {
    const p = BG_PRESETS[e.target.value];
    if (!p) return;
    document.getElementById('bgColor').value = p.bg;
    document.getElementById('bgColor2').value = p.bg2;
    updateDesignerPreview();
  });

  // Designer toolbar: Reset (Save Template lives in the top preview toolbar)
  document.getElementById('resetDesigner').addEventListener('click', doResetDesigner);

  // ── Designer tab switching ──
  document.querySelectorAll('.ctrl-tab[data-panel]').forEach(tab => {
    tab.addEventListener('click', () => {
      const panel = tab.dataset.panel;
      document.querySelectorAll('.ctrl-tab').forEach(t => t.classList.toggle('active', t === tab));
      document.querySelectorAll('.ctrl-panel').forEach(p => p.classList.toggle('active', p.id === `panel-${panel}`));
    });
  });

  // Add-text button
  const addBtn = document.getElementById('btnAddText');
  if (addBtn) addBtn.addEventListener('click', addTextElement);

  // Canvas resize observer + viewport resize (height changes)
  const ro = new ResizeObserver(() => scalePreview());
  const scaler = document.getElementById('canvasScaler');
  if (scaler) ro.observe(scaler);
  let _rt;
  window.addEventListener('resize', () => { clearTimeout(_rt); _rt = setTimeout(scalePreview, 120); });

  // Deselect when clicking outside the canvas
  document.addEventListener('pointerdown', (e) => {
    if (!state.selectedElId) return;
    if (e.target.closest('#certPreview') || e.target.closest('#celToolbar')) return;
    deselectElement();
  });

  // Logo & background image
  initLogoUpload();
  initBgImage();
}

function doResetDesigner() {
  const sel = getTemplate(state.selectedTemplateId);
  // Reset back to the selected template's original layout
  setDesignerCfg({ ...DESIGNER_DEFAULT, ...(sel && sel.cfg ? sel.cfg : {}) });
  state.elements = buildElements(sel && sel.cfg ? sel.cfg : DESIGNER_DEFAULT);
  state.selectedElId = null;
  updateMainPreview();
  pushHistory(true);
  toast(t('toast_reset'), 'info');
}

function doSaveTemplate() {
  const name = document.getElementById('templateName').value.trim() || 'My Custom Template';
  const cfg = { ...getDesignerCfg(), elements: state.elements.map(e => ({ ...e })) };
  const tpl = { id: `custom-${uid()}`, name, description: t('custom_template_desc'), renderer: 'designer', custom: true, cfg };
  state.customTemplates.push(tpl);
  state.selectedTemplateId = tpl.id;
  saveState();
  toast(`"${name}" ${t('toast_saved')}`, 'success');
  showTab('templates');
}

/* ── Image → base64 (downscaled) ─────────────────────────────── */
async function readImageAsBase64(file, maxW, maxH, mime = 'image/png') {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const ratio = Math.min(maxH / img.height, maxW / img.width, 1);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * ratio);
      canvas.height = Math.round(img.height * ratio);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL(mime, 0.9));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image load failed')); };
    img.src = url;
  });
}

/* ── Logo Upload ─────────────────────────────────────────────── */
async function readLogoAsBase64(file) {
  return readImageAsBase64(file, 500, 200, 'image/png');
}

function updateLogoUI() {
  const dropZone = document.getElementById('logoDropZone');
  const ph = document.getElementById('logoPh');
  const preview = document.getElementById('logoPreviewImg');
  const controls = document.getElementById('logoControls');
  if (!dropZone) return;
  if (state.logo) {
    dropZone.classList.add('has-logo');
    ph.style.display = 'none';
    preview.src = state.logo;
    preview.style.display = 'block';
    if (controls) controls.style.display = 'block';
  } else {
    dropZone.classList.remove('has-logo');
    ph.style.display = '';
    preview.src = '';
    preview.style.display = 'none';
    if (controls) controls.style.display = 'none';
  }
}

function initLogoUpload() {
  const dropZone = document.getElementById('logoDropZone');
  const fileInput = document.getElementById('logoInput');
  const posSelect = document.getElementById('logoPosition');
  const sizeSelect = document.getElementById('logoSize');
  if (!dropZone) return;

  if (posSelect) posSelect.value = state.logoPosition;
  if (sizeSelect) sizeSelect.value = state.logoSize;
  updateLogoUI();

  async function handleFile(file) {
    if (!file || !file.type.startsWith('image/')) { toast(t('toast_img_file'), 'error'); return; }
    try {
      state.logo = await readLogoAsBase64(file);
      saveState(); updateLogoUI(); updateDesignerPreview();
      toast(t('toast_logo_uploaded'), 'success');
    } catch (e) { toast(t('toast_logo_error'), 'error'); }
  }

  dropZone.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => { if (e.target.files[0]) handleFile(e.target.files[0]); e.target.value = ''; });
  dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
  dropZone.addEventListener('drop', (e) => { e.preventDefault(); dropZone.classList.remove('drag-over'); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); });

  document.getElementById('btnChangeLogo').addEventListener('click', (e) => { e.stopPropagation(); fileInput.click(); });
  document.getElementById('btnRemoveLogo').addEventListener('click', (e) => {
    e.stopPropagation(); state.logo = null;
    saveState(); updateLogoUI(); updateDesignerPreview();
    toast(t('toast_logo_removed'), 'info');
  });

  if (posSelect) posSelect.addEventListener('change', () => { state.logoPosition = posSelect.value; saveState(); updateDesignerPreview(); });
  if (sizeSelect) sizeSelect.addEventListener('change', () => { state.logoSize = +sizeSelect.value; saveState(); updateDesignerPreview(); });
}

/* ── Background Image Upload ─────────────────────────────────── */
function updateBgImageUI() {
  const dropZone = document.getElementById('bgImgDropZone');
  const ph = document.getElementById('bgImgPh');
  const preview = document.getElementById('bgImgPreview');
  const controls = document.getElementById('bgImgControls');
  if (!dropZone) return;
  if (state.bgImage) {
    dropZone.classList.add('has-logo');
    ph.style.display = 'none';
    preview.src = state.bgImage;
    preview.style.display = 'block';
    if (controls) controls.style.display = 'block';
  } else {
    dropZone.classList.remove('has-logo');
    ph.style.display = '';
    preview.src = '';
    preview.style.display = 'none';
    if (controls) controls.style.display = 'none';
  }
}

function initBgImage() {
  const dropZone = document.getElementById('bgImgDropZone');
  const fileInput = document.getElementById('bgImgInput');
  const fitSelect = document.getElementById('bgImgFit');
  const opacityInput = document.getElementById('bgImgOpacity');
  const opacityVal = document.getElementById('bgImgOpacityVal');
  if (!dropZone) return;

  if (fitSelect) fitSelect.value = state.bgImageFit;
  if (opacityInput) { opacityInput.value = state.bgImageOpacity; if (opacityVal) opacityVal.textContent = state.bgImageOpacity; }
  updateBgImageUI();

  async function handleFile(file) {
    if (!file || !file.type.startsWith('image/')) { toast(t('toast_img_file'), 'error'); return; }
    try {
      // Larger size cap for backgrounds (matches certificate aspect)
      state.bgImage = await readImageAsBase64(file, 1056, 816, 'image/jpeg');
      saveState(); updateBgImageUI(); updateDesignerPreview();
      toast(t('toast_bgimg_added'), 'success');
    } catch (e) { toast(t('toast_logo_error'), 'error'); }
  }

  dropZone.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', (e) => { if (e.target.files[0]) handleFile(e.target.files[0]); e.target.value = ''; });
  dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
  dropZone.addEventListener('drop', (e) => { e.preventDefault(); dropZone.classList.remove('drag-over'); if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]); });

  document.getElementById('btnChangeBgImg').addEventListener('click', (e) => { e.stopPropagation(); fileInput.click(); });
  document.getElementById('btnRemoveBgImg').addEventListener('click', (e) => {
    e.stopPropagation(); state.bgImage = null;
    saveState(); updateBgImageUI(); updateDesignerPreview();
    toast(t('toast_bgimg_removed'), 'info');
  });

  if (fitSelect) fitSelect.addEventListener('change', () => { state.bgImageFit = fitSelect.value; saveState(); updateDesignerPreview(); });
  if (opacityInput) opacityInput.addEventListener('input', () => {
    state.bgImageOpacity = +opacityInput.value;
    if (opacityVal) opacityVal.textContent = opacityInput.value;
    saveState(); updateDesignerPreview();
  });
}

/* ================================================================
   NAMES SECTION
================================================================ */
function initNames() {
  document.getElementById('btnAddStudent').addEventListener('click', submitNameForm);
  document.getElementById('btnClearForm').addEventListener('click', clearNameForm);
  document.getElementById('btnCancelEdit').addEventListener('click', cancelEdit);
  document.getElementById('btnClearAll').addEventListener('click', () => {
    if (!state.students.length) return;
    if (!confirm(`${t('confirm_clear_all')} ${state.students.length} ${t('confirm_entries')}`)) return;
    state.students = [];
    saveState(); renderNamesTable(); updateGenStats();
    toast(t('toast_cleared'), 'info');
  });
  document.getElementById('btnImportCSV').addEventListener('click', () => document.getElementById('csvInput').click());
  document.getElementById('csvInput').addEventListener('change', (e) => { if (e.target.files[0]) importCSV(e.target.files[0]); e.target.value = ''; });
  document.getElementById('searchStudents').addEventListener('input', (e) => renderNamesTable(e.target.value.toLowerCase()));

  document.getElementById('fDate').value = new Date().toISOString().split('T')[0];
  renderNamesTable();
}

function getFormData() {
  return {
    name: document.getElementById('fName').value.trim(),
    school: document.getElementById('fSchool').value.trim(),
    subject: document.getElementById('fSubject').value.trim(),
    grade: document.getElementById('fGrade').value.trim(),
    instructor: document.getElementById('fInstructor').value.trim(),
    date: document.getElementById('fDate').value,
  };
}

function clearNameForm() {
  ['fName','fSchool','fSubject','fGrade','fInstructor'].forEach(id => { document.getElementById(id).value = ''; });
  document.getElementById('fDate').value = new Date().toISOString().split('T')[0];
}

function cancelEdit() {
  state.editingStudentId = null;
  document.getElementById('formTitle').textContent = t('add_entry');
  document.getElementById('btnAddStudent').innerHTML = `<i class="fas fa-plus"></i> ${t('add_entry')}`;
  document.getElementById('btnCancelEdit').style.display = 'none';
  clearNameForm();
}

function submitNameForm() {
  const data = getFormData();
  if (!data.name) { toast(t('toast_enter_name'), 'error'); document.getElementById('fName').focus(); return; }
  if (state.editingStudentId) {
    const i = state.students.findIndex(s => s.id === state.editingStudentId);
    if (i !== -1) state.students[i] = { ...state.students[i], ...data };
    toast(`${t('toast_updated')}: ${data.name}`, 'success');
    cancelEdit();
  } else {
    state.students.push({ id: uid(), ...data });
    toast(`${t('toast_added')}: ${data.name}`, 'success');
    clearNameForm();
    document.getElementById('fName').focus();
  }
  saveState(); renderNamesTable(); updateGenStats();
}

function editEntry(id) {
  const s = state.students.find(e => e.id === id);
  if (!s) return;
  state.editingStudentId = id;
  document.getElementById('fName').value = s.name;
  document.getElementById('fSchool').value = s.school || '';
  document.getElementById('fSubject').value = s.subject || '';
  document.getElementById('fGrade').value = s.grade || '';
  document.getElementById('fInstructor').value = s.instructor || '';
  document.getElementById('fDate').value = s.date || '';
  document.getElementById('formTitle').textContent = t('edit_entry');
  document.getElementById('btnAddStudent').innerHTML = `<i class="fas fa-check"></i> ${t('save_changes')}`;
  document.getElementById('btnCancelEdit').style.display = '';
  document.getElementById('fName').focus();
  document.querySelector('.add-form').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function deleteEntry(id) {
  const s = state.students.find(e => e.id === id);
  if (!s || !confirm(`${t('confirm_remove')} "${s.name}"?`)) return;
  state.students = state.students.filter(e => e.id !== id);
  if (state.editingStudentId === id) cancelEdit();
  saveState(); renderNamesTable(); updateGenStats();
  toast(`${t('toast_removed')}: ${s.name}`, 'info');
}

function renderNamesTable(filter = '') {
  document.getElementById('studentCount').textContent = state.students.length;
  const filtered = filter ? state.students.filter(s => JSON.stringify(s).toLowerCase().includes(filter)) : state.students;
  const tbody = document.getElementById('studentsBody');
  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state"><i class="fas fa-user-graduate"></i><p>${filter ? t('no_matching') : t('no_entries')}</p></div></td></tr>`;
    return;
  }
  tbody.innerHTML = filtered.map((s, i) => `
    <tr>
      <td class="col-num">${i + 1}</td>
      <td><strong>${esc(s.name)}</strong></td>
      <td class="col-hide-sm">${esc(s.school)}</td>
      <td class="col-hide-sm">${esc(s.subject)}</td>
      <td class="col-hide-md">${esc(s.grade)}</td>
      <td class="col-hide-md">${s.date ? formatDate(s.date) : ''}</td>
      <td class="col-act"><div class="row-actions">
        <button class="row-btn row-btn-edit" data-id="${s.id}" title="${t('edit_entry')}"><i class="fas fa-pen"></i></button>
        <button class="row-btn row-btn-del" data-id="${s.id}" title="${t('ctrl_remove')}"><i class="fas fa-trash"></i></button>
      </div></td>
    </tr>
  `).join('');
  tbody.querySelectorAll('.row-btn-edit').forEach(b => b.addEventListener('click', () => editEntry(b.dataset.id)));
  tbody.querySelectorAll('.row-btn-del').forEach(b => b.addEventListener('click', () => deleteEntry(b.dataset.id)));
}

function importCSV(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const lines = e.target.result.split('\n').map(l => l.trim()).filter(Boolean);
    let added = 0;
    lines.forEach((line, i) => {
      if (i === 0 && line.toLowerCase().startsWith('name')) return;
      const parts = line.split(',').map(p => p.trim().replace(/^"|"$/g,''));
      const [name, school, subject, grade, instructor, date] = parts;
      if (!name) return;
      state.students.push({ id: uid(), name, school:school||'', subject:subject||'', grade:grade||'', instructor:instructor||'', date:date||'' });
      added++;
    });
    saveState(); renderNamesTable(); updateGenStats();
    toast(`${t('toast_imported')} ${added} ${t('entries_label')}`, 'success');
  };
  reader.readAsText(file);
}

/* ================================================================
   EXPORT
================================================================ */
function updateGenStats() {
  const n = state.students.length;
  const pc = document.getElementById('previewCount');
  if (pc) pc.textContent = n;
  const badge = document.getElementById('accNamesBadge');
  if (badge) { badge.textContent = n; badge.style.display = n ? '' : 'none'; }
}

function initGenerate() {
  // Export dropdown (single button → choose Images / PDF)
  const exportBtn = document.getElementById('btnExport');
  const exportWrap = document.getElementById('exportWrap');
  const closeExport = () => exportWrap && exportWrap.classList.remove('open');
  if (exportBtn) exportBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    exportWrap.classList.toggle('open');
  });
  document.addEventListener('click', (e) => { if (exportWrap && !exportWrap.contains(e.target)) closeExport(); });

  const pdf = document.getElementById('btnDownloadPDF');
  if (pdf) pdf.addEventListener('click', () => { closeExport(); downloadAllPDF(); });
  const zip = document.getElementById('btnDownloadImages');
  if (zip) zip.addEventListener('click', () => { closeExport(); downloadAllImages(); });

  // Enlarge current preview in a modal
  const zoom = document.getElementById('btnZoomPreview');
  if (zoom) zoom.addEventListener('click', () => openModal(getActiveTemplate(), previewStudent()));

  // Top Save Template button
  const saveTop = document.getElementById('saveTemplateTop');
  if (saveTop) saveTop.addEventListener('click', doSaveTemplate);

  // Undo / Redo buttons + keyboard shortcuts
  const u = document.getElementById('btnUndo'), r = document.getElementById('btnRedo');
  if (u) u.addEventListener('click', undo);
  if (r) r.addEventListener('click', redo);
  document.addEventListener('keydown', (e) => {
    const mod = e.metaKey || e.ctrlKey;
    if (!mod || e.key.toLowerCase() !== 'z') return;
    // Don't hijack native undo while typing in a field / inline-editing text
    const ae = document.activeElement;
    if (ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA' || ae.isContentEditable)) return;
    e.preventDefault();
    if (e.shiftKey) redo(); else undo();
  });

  updateGenStats();
}

// Export uses whatever is currently previewed (live design or selected template)
function getGenTemplate() { return getActiveTemplate(); }

/* ── Export ── */
const delay = (ms) => new Promise(r => setTimeout(r, ms));

function showProgress(pct, msg) {
  document.getElementById('progressWrap').style.display = '';
  document.getElementById('progressFill').style.width = `${pct}%`;
  document.getElementById('progressText').textContent = msg;
}
function hideProgress() { document.getElementById('progressWrap').style.display = 'none'; }

async function certToCanvas(template, student) {
  const area = document.getElementById('renderArea');
  area.innerHTML = '';
  const el = renderCertificate(template, student);
  el.style.cssText += `;width:${CERT_W}px;height:${CERT_H}px;`;
  area.appendChild(el);
  await delay(120);
  const canvas = await html2canvas(el, { width: CERT_W, height: CERT_H, scale: 2, useCORS: true, allowTaint: true, backgroundColor: null, logging: false });
  area.innerHTML = '';
  if (!MJ.active) MJ.watermark(canvas);
  return canvas;
}

/* Entries to export: real entries, or a single certificate from what was typed on the canvas. */
function exportList() {
  if (state.students.length) return state.students;
  const d = state.draft || {};
  if (Object.values(d).some(v => v && String(v).trim())) return [previewStudent()];
  return [];
}

async function downloadAllPDF() {
  const list = exportList();
  if (!list.length) { toast(t('toast_no_entries'), 'error'); return; }
  const template = getGenTemplate();
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: 'landscape', unit: 'px', format: [CERT_W / 2, CERT_H / 2] });
  for (let i = 0; i < list.length; i++) {
    showProgress(Math.round(i / list.length * 95), `${t('rendering')} ${i + 1} ${t('of')} ${list.length}…`);
    if (i > 0) doc.addPage();
    const canvas = await certToCanvas(template, list[i]);
    doc.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, CERT_W / 2, CERT_H / 2);
    await delay(20);
  }
  showProgress(100, t('saving')); await delay(50);
  doc.save('certificates.pdf');
  hideProgress(); toast(t('toast_pdf'), 'success');
}

async function downloadAllImages() {
  const list = exportList();
  if (!list.length) { toast(t('toast_no_entries'), 'error'); return; }
  const template = getGenTemplate();
  const zip = new JSZip();
  const folder = zip.folder('certificates');
  for (let i = 0; i < list.length; i++) {
    showProgress(Math.round(i / list.length * 90), `${t('rendering')} ${i + 1} ${t('of')} ${list.length}…`);
    const canvas = await certToCanvas(template, list[i]);
    const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
    const safe = (list[i].name || 'certificate').replace(/[^a-z0-9]/gi, '_').toLowerCase();
    folder.file(`${String(i + 1).padStart(3,'0')}_${safe}.png`, blob);
    await delay(20);
  }
  showProgress(95, t('compressing'));
  const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
  const url = URL.createObjectURL(zipBlob);
  const a = document.createElement('a'); a.href = url; a.download = 'certificates.zip';
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
  hideProgress(); toast(t('toast_zip'), 'success');
}

/* ================================================================
   MODAL
================================================================ */
function openModal(template, student) {
  state.modalStudent = student;
  state.modalTemplate = template;
  const holder = document.getElementById('modalCertHolder');
  holder.innerHTML = '';
  holder.appendChild(renderCertificate(template, student));
  const maxW = window.innerWidth * 0.9 - 40;
  const maxH = window.innerHeight * 0.78 - 40;
  const scale = Math.min(maxW / CERT_W, maxH / CERT_H, 1);
  const offsetX = Math.max(0, (maxW - CERT_W * scale) / 2);
  holder.style.cssText = `width:${CERT_W}px;height:${CERT_H}px;transform-origin:top left;transform:translateX(${offsetX}px) scale(${scale})`;
  const scaler = document.getElementById('modalScaler');
  scaler.style.height = `${CERT_H * scale + 40}px`;
  scaler.style.minWidth = `${maxW + 40}px`;
  document.getElementById('certModal').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('certModal').classList.remove('open');
  document.body.style.overflow = '';
  state.modalStudent = null; state.modalTemplate = null;
}

function initModal() {
  document.getElementById('modalBackdrop').addEventListener('click', closeModal);
  document.getElementById('modalClose').addEventListener('click', closeModal);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

  async function dlHelper(format) {
    if (!state.modalStudent || !state.modalTemplate) return;
    const btnId = format === 'img' ? 'modalDlImg' : 'modalDlPDF';
    const btn = document.getElementById(btnId);
    btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
    const canvas = await certToCanvas(state.modalTemplate, state.modalStudent);
    const safe = state.modalStudent.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    if (format === 'img') {
      const a = document.createElement('a');
      a.href = canvas.toDataURL('image/png'); a.download = `${safe}_certificate.png`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      btn.innerHTML = `<i class="fas fa-image"></i> ${t('dl_image')}`;
      toast(t('toast_img'), 'success');
    } else {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ orientation: 'landscape', unit: 'px', format: [CERT_W/2, CERT_H/2] });
      doc.addImage(canvas.toDataURL('image/jpeg', 0.95), 'JPEG', 0, 0, CERT_W/2, CERT_H/2);
      doc.save(`${safe}_certificate.pdf`);
      btn.innerHTML = `<i class="fas fa-file-pdf"></i> ${t('dl_pdf')}`;
      toast(t('toast_pdf'), 'success');
    }
    btn.disabled = false;
  }

  document.getElementById('modalDlImg').addEventListener('click', () => dlHelper('img'));
  document.getElementById('modalDlPDF').addEventListener('click', () => dlHelper('pdf'));
}

/* ================================================================
   INIT
================================================================ */
document.addEventListener('DOMContentLoaded', () => {
  loadState();
  initNavigation();
  initDesigner();
  initNames();
  initGenerate();
  initModal();
  initLanguage();

  // Seed the Designer form from the currently selected template so the
  // live preview is consistent and customizing continues from it.
  const selTpl = getTemplate(state.selectedTemplateId);
  if (selTpl && selTpl.renderer === 'designer' && selTpl.cfg) loadTemplateIntoDesigner(selTpl);

  openAccordion(state.currentTab || 'templates', false);
  setTimeout(scalePreview, 120);
  setTimeout(scalePreview, 400);
  window.addEventListener('load', () => setTimeout(scalePreview, 50));
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => scalePreview());
});


/* ================================================================
   MAJOODAH — التفعيل، العلامة المائية، ولصق قائمة الأسماء
================================================================ */
const MJ = (function () {
  const HASHES = ["3a270b0422678615308408d2b41e4d043d068d945fa06c5f27beb6122aab9b79", "528058f6876c8586966d7a5621087b02a5d2e54a08e028e3d113853d2ee8cec7", "a2ce55f6ec820ce8a985d67a94b8636fe9f7cd6ba50caaf8c260404efd09bf06", "dc54dc6e2416fbeeebdd74b69ec22390cf458c986653dff4788da8a3c9a864cf", "a662809c06357384ea8366405edf305b7eb3f6995b558e948489cfc6802214bf", "497a2ec3fce4476fa1651706f997d03dbdf7e57e4611df49b91dbcb31974a846", "bd2b11522829179a112340ecac3e2da39c4e43e52f98823e7c84a1c320909ff9", "2edb7b9c1353cb5ca31896938d842f989f432ddb89de392725fd486d7d558c81", "38ddf4f848e480181ed511890d9f6c91469aa8ad0fa6474df3a727b4dc70ec07", "4a0138489fe0abbf1804586deb4dc469645365a70541b90a2829c9328bc0be7c", "42323ccfcbf228e33b1732b6a682def9a4c1baac5742e84c2d66f46b2d2072c2", "904e5f41b1f397896d54b44ebc8ae07795964eed13a3ec1c2a8fccb10c2701d8", "990a6f9f43489b07f10fcb6ddec6f231098e9894bcf785f2e9082055b74fe069", "85a3f9d6aaa86b97fae21fbe0283d13b848504784d465a3922aa988c36c16607", "8abf1f92594d32795c6a8e88802a7152e983209ac8c12ce4e3bf8e27a7ba7c2f", "de5462ff0eb1218fe8b02ddc28a98784f2e54778f4db0483bde5bedd13b2e844", "53c29480ac94b3f11abf31f76a4878998e66d9f57f9f4a394908857830b2b524", "dab0060e030ae40773cb121f2b10dc6053df22da32b4a3bf7c781c6f38a38ded", "e8f1c405d288cfbcf622b05033477597ca231ded5987bfd8b830582b93a5478b", "65226ad038798f2fe3beb210d4cb90b67c96480e0a3a1128d97d1a9560ec9e5f", "564e88d90e0c016364e938d526f08ba9245f672b3f62f93631dcb93b0f3bb56b", "3fbcca973ca0c1df3cfd33b816853ed374cd841da034c2634cdcdcdb7b15786b", "caa586eb24c1b3091c9ddc2b24d11e29442a2d6dca21b460ed70e6d84cf8b3d2", "3712b64824a911f7bb00fe62f9f120771622e88abc6430e71a9cc1553abaa589", "10c53dc51cf58a44f49ecd21134b6072751c5ee1ea0ba8e1e64e0f3994014296", "7468a79e5797555003feb72325053b2b1d339019f6ec312ab2553da8ca1de4ef", "b85d3f121f09a58e7c223e7039581f207c10c2a208ac22fd66af1515ad608703", "cef5d2bec450ad94d67dbd695359620778849f8c49dd113ac3fa6a7cdf8aa038", "597e121012b4d99e111037765e35e5f11a1b07562d49f7abc585249118a2add2", "1cf101df85082736e6fabd6e00efdc08d44533bcf637013ec0d8685882982926", "0f7b709290372acfd344673ff6fe59a4ffab5ceaad945cd6d847f38ec0adb811", "4043fdbbba87ccb78b01f5be5dd4e54f265e0ca4926f6135c717bbc137a727f8", "bf22e476c2e514f6345ef4f686b2b90ffadff18a1d7c3a9fd8345d7339cf0ed9", "e977b7ca266a32ecae77330a8218137634cf49401ee4ee66d049b8f45fcf5138", "a1a1a82810be097144193f10b7fa8b1b23fad09658bccdd237cf0ad3cbbe715a", "2004d9a2c117e4b48668db7e23a3439b519f5bb3d705f38e7098768b9c48c27f", "82725b2a868e9d720540b6be4ea2abc0b07e15be4c4971ad60ad2f6705cffc07", "f66f7ab70c07abb5e03b44b0f593bfdcbe780771d4e033a0bca7112c3c29e160", "2c1a3176db9d92254ffd597f203be7c9a65f8ad62f73879b1e6a0214e30f9d13", "74afe6bace5c67a4ad9d2e74982bce9ab3215fe3b2a3d10963a28424fb55fd1f", "7ff116e3f1b765da1d66cd03d3aeb1a175eb854aadf6420ed27e8fd3aadd0f8a", "48bd50b1e0fac6d107d5ccae0d703d58677b5c9c38d880e06ce0b1db3f9b87c4", "ab407c1ab801fb41c824a2088a9728a93f648b881af7e807c64989c0177d3a21", "4deeb25639d12cada08dcffe6ec9dc6fc9015707ebdd367c9a29bdb3d1d3affe", "0a23fef61458967eae8c2451ae0917c53195812f322fefe7b264f97c7fe4c1b4", "b746919525ff3be5db6cb48ee97921a907ab1c77cf5817c050199b044d248023", "0f126f837b05d6985fad437aef9dda08015c5c80a4838d4bff19d670275ad712", "59696b38f93f6c7d576b81bc3282374cc26dccd24151408c4d4a3419c19b1979", "eaaaf5ce792b5db03c06960a757ab64c8ffcd593db0800bbee1c15e21e169aab", "10c2d8363e5ba39fd2f1f9f79b15cc05e353f346306f0cf7330f4f4129229840", "3b4e69441642af05bda83c0329923916ce20255e17abe71cdc18f56b29389975", "e06fbc50195dc6f51a680f5f005f7d33dbdb80204ca5ecbd1348bd88affc4540", "ee41e742bb8b3cd1f1f51557179dca15754b770a001fa4e0e87a620e91a4f6ec", "7354bf16bc1b3927cd94fe74c06ab0a0f4f2643e5d6d2774dd8d0caf8742b997", "a74e7c3460513700da012f5ea5e42a048b86050c88608ab32e524b70ec6116e0", "1710c825248a45917a4a37fadb210720b6514e6dc6b454dfd43adb979b4d5773", "37de624583a50e9d5b9ea3f581be8af98a3d7bf5430a8c95f151f2c4c544c1e9", "186870561053cf1fc98ba806795829d7ffa0e65adbcaf89b2118225a6abe8dc6", "59cd40ea84cf90a464735f44c0bff1bd9a91541464258f842f73f8870028e8a7", "7f78c37ca3afc5234fa54ef2de701807d413ba51f5627809e546264a949b19ee", "ae749f4a0f111f1fca7c06f1d26d6fb4a19d40b8b610ef04b25bc57c5871ddab", "4797a117ce5d8d32c9b53a2e261c7cbc149bad99857b60c08d8798ea6e921cd3", "065003036cdc15ef57948a195e92ac93b6f7c37fd56e36cf982f450eeaeb4bed", "a83fcb50d5b5fe59fe220a102b8405125769f2f1ab718eee6bb1eb3dc350550c", "3b2bfa1055131f58012fdb84866df693a32f72dcf54b1c3cf658b041b6a1f4bc", "1c471b9fab267fa3ef2472a5593340e2ced5a3de1938cac2b847846bf9f637a4", "9d23953db144cdf0b942c929a86d0b8a8bdaafb3d896ade3f07f559131439443", "0bf78afe8a2489f023d2f2b195e9d5ce5ae34bca7a29dafb6abfc5b5bddaafa1", "8bf67a5bda4d05492df9f5bcde1a54d5c6c240a351bce2332bb6a3a61e6f681f", "6a9eab758d449ac63bef556cc9c7cf7c4ba4905fa742848b2f818e3c2bf70708", "a227340232544e5a1815299ad9919df6a6cedd92df3663b621eb92c398a17e38", "ca91583a1d4521ff51e105cafe0ecfbeed42fba988646e79415aa8c57df3c9ff", "70f260dee6c1e26b6a1a7dd824a9305e8f77ba316ef0c4ce0c0446fa1a98b01c", "7ae99617f876a252e452aa23d23e1d5a21dc2d288279764978d34c983a40d4a8", "90f4b61cb579c4cd33962351972c3fabc591a4fdf1b70ea04f56089f23a9d31e", "692f9fc394c34f74d41aa49f4f35e7e3b76d981f3ba83ba63f1397961f4fd123", "13d2ab3def75b7fd6026eee3cd6013e0ac5ccec49a85119bd6a00bcf6554caa8", "f2f48f37c9fe3f9c9bb352c717f8b7f08db0b0518671156b3e5a8570434c0129", "cc85892bb15b32c3a9f7e7a8f0bfb7bb4443da8e5d965960427f2f8a9d7fea73", "e844f24124b364fc395145b940f82faa3f39f718c376c30af92d517c2047aa90", "660f55f788e5b228df532c296c242f151443952ff1b9732ba607556df2a6f260", "e2d8e532e5298788c9e1108b9a49ff352414d763c3676f95804905a00fcc0ed7", "51ee9687e893c292d1fb0774d48d64c063d8dc3b391c00f1c9e747a8428eff98", "d143bdb33156fbaa75fe37f6d520dd6192c667fe5e90df6a3790dae932191329", "95feac8768bb8c66f04be9a70d0d8615630e6505622b10bfc2e1d416827b8f82", "5b7451dafda1bf0d7ae49f1cfd2f0211b1771ac1109e0211b0e655096bee014c", "7e3f681be480af7411d4ebf29c24310cc680fdd891b1cc883e2bb250ae8ac6ce", "f5bd8ad17368867163d59f0f682706d7aa4d5d1ae10d2e7874391bd5655a2aa9", "3f653bd2252f89afa154a6d3b3e8ff84589ff2b60e4733c00666fa1e12a0806d", "680352626410f6c917823a54ad80c99a8f1dd4b80a58cc2705fad8c4d56c0a49", "07d6aa5a79640712cb70877faa107c1ce76833b10c77cc6b1768923775aa968e", "8b0ea81435024e2514e4e72a948c2cd042f18c8dddd027fad5d3d445aff882df", "8c34dc55aaa550fd59480ceb4cb9105ea695dc59c1d2e26dd69b07c4036aeeab", "8af1e17a34d99c13f05ad4fea8f8ed0587b3d47e7fc887e3cbbc613c93d68b96", "85c7d63e050185263aafae627fb63be3e13aae8c2aa1a0d1040b357d04604075", "c3915dd2459be535b04d8279516d10fb0e2af5e5e58e303f7a8864c0ee895143", "005b80164a97cbad49a06dc89d0a7e308f78aafbd02d6075ffd7246b4f291842", "9b5c9cd2f7ac9eede1ff72fe855bc0749923438813a960ac9214d2582f6582c1", "99b69bf93689b293e566598b00c4b27921eea21dadcb148fab1a965085992b52", "d667db37f82c290d5216df5f4e76f8ce637a7c75cb7076b905d49705cd8517e6", "f41b9e6bf09c95084db8a7c323fd1ec4dd1b6e2fac00f761b6c593ce012e2790", "e2661defa3bf348812b4d0fcf3b28d507bf6a55ff072152dd7d91cf72e892140", "d3931fdbb86584610854dfa3f02bf5c9931a0b1271ec4a60c7c6adf3236ebf7b", "dd89f789f9a1ba65d17470d3a6f162413a7fee5a80463d874e9eca6a6e4655b8", "49077fc480e98979a7287cbe05837bc70a5e9210c020c43ce130b8c0a42815d9", "af4a67439264e16f5fec2849f07ddc161c3f1d230af8da723b18d7214b88e4ce", "4d6fbda1fc6452f4576a32c0ece6474aa1938878d56dab7f8929e50753fb530c", "579e9b23445c9c1b74043be4eb3aff1ef812fe68e8f9fe5335590f115ae8c7b0", "d949ac1d25a0873a68ef7aca0cce1922b3ebd1084c4d6d34fd8a3e75ac7e2027", "978c091a406ac4c85d9854952325f3c626e30bacdb2ad1b8f14344b0e2c66d7a", "1415c33ea3cdfec312acbc9e103981583d5db2fccade34295c6584c943c71493", "ed9176e77920bf78de76f6c92add8fdfa630023560d28bf0bbda9d8ccf3ad20c", "33781ee8cca7dbb2ac1c549c84a2486fd8ff764029b84a36c5fe6a827bbe9b49", "91bfd2754ae10feaa18dfbc89fd1dadc7f3fa5dc6ccccf85c36a9a1d4be3d202", "3d6c75eb416f2c9b29b52a0d710a4e635c604cdf42f87e19ab3c65b24e096a1e", "c16e35e9184441b4d85ccaa2c28b47084b4cfe27a1705dfd86bd9744c2a1e2df", "e12751b60911075d1cdba09e0d3fc0818613d144b1ba67d8ddba985771ac94ef", "f0c7034d6b9761deca9b749b762725af4b0cc563f47ad9e7f9889be4f00152f2", "6700a3a9dc75c3eb2b036c10ac7d825ad79ef102ab7e3570a5914e1ffcf94d79", "3d9ace4099cef636091295023fa56eef00a44d12bc7b8e04fa2ba2849b11d1b2", "b0eee534608cba5b36f66acbd03277b377ed6a7a8311dde2767d41c3339a11f7", "c4b0bf397d61acd82f88488e089b8c00bbc6f8c614b79831518ddd5f3f99abb1", "79f0880eb18087629da30278c3c35307a5a9a3400f554ec16fd00113e3789ec2", "83ff17044cb28b3aeebaae2271780c221144225ac5d01d766293e8fb40dddcb0", "6dc6be589b7597f2edaac490b4e61b7e7332ac9d50179db0ea3d760c95820f54", "5781474eb222f1947fce26a39583e0a0d4e48593bde1b344b70fb90af0cb4c8d", "d7a79ecd6ac45f7032f7fd7eb686ba406134265c33684cc51cb0d4d1f114c5a8", "e6ef802e28540a21581f8f20ea2794b2f298de2030561938ec2b54ba37df34db", "1f6bb9c3be2006098368481e010de33da37cb57e1a99b7024998c62555f792f2", "20d5ee27540e75ad796b4e54986b990efff82381ddaba5a66272e09f1215dbb4", "3d464bb93fe2719258331747f8b57db6a14c89f2a42d66882c9d91f870e6f61c", "c299a9179f9f3227b97c929774bfecb824635c34e549fb237194e16ec3b009b8", "c07d552cfe8dac1c4b78515ddf676692e6f637c7e524826fa697ee9f0ba45b61", "aae7de363d3ddd14fb68883013f1fe1c376e3be0af60519ffffa61f129188e7e", "3d9380b0463c4b4cabcdf9c3eed9db6af6e43dbad2e411cb39e6bd8812d92ff1", "957671391c97aac61ea0a3d36b6d8e59323ae94d35e9f4c2153756849f0ccc57", "2fbd9e1014d0a2b2ebebd0cdb9c37d6cfc6dddc59faf122832e63e3d8693284b", "b59599544603555c0b44c930be19a964ab47a20ddf07d618f30314d804a0079a", "4d7270b0433cb4287012b99e37f47a8671c9cbdef393e461463b85e8f06c3599", "c0ebeed80b6470477d97def16267757fa6c14c57e350d8a0426829f2f4e3824f", "ef847576c193ca29a477662e834350b9f133d307f838da6b44b6602f43fdbd91", "68e74011dce802a3423dfa2d3eee25fcfb70ca8ce5eae1f1e5e89e5787bf091f", "8444bde66d27bdfc0e84b72c709d8a175ddcf3335f4041962f3070f1f400eabb", "01cc5e3425f803aa374d82457c9187e6360c966d6cfa55d8c04ec415111f7746", "e3c0896de306098596c8d5eca7751707319f27edbbcbeacf2ded07b8d6739fbf", "7d72fa9db2cf7f5fd7fb250d8caf8b84a1408ad61f8abfeccd3085470de79d90", "16d588edf7d6e876e2b661580b08c7ade72f2447f3e6659ceca2a9a109ff9b3e", "b008c364da24315b9f233f455998b9f5466cdcaec0b9b7fdda37d23a8e588a7f", "65a66232e65efbc928d2f144505ea5c15b481a7937ef8126bce8bc0e5dbba647", "a66c6ef85e47c8b2799f0f72fd4f19011703caab3344b59fa6f4693d7945b0c2", "691f3de57eaa1ef40b2a87d14a64b0bb1c54ba0aaf6b664318ebd0f425a41bb2", "a254117b967a2a3747e08a4e3eb1e0c7ec4fa44625690695a7ee0f7456eb20ed", "c4799b5fe7062cb6c256f7bace131693c58fa679d3f1f30910da2c9e8b82309c", "e91d86740236acb9daa9c7d878ae52e12339dffe1cd55029f7c3a483361ce64f", "756a121996e5309ee3f275289a5aeeb3e63a077045f29659bac012e4ccdbbcbc", "1d4cbe3337a9e71ca6605b1a75a714a0427e24cac4bf1dd2795700953bb36c0a", "60f402b2e02a4dcbb06c5b6e29d85f1ffb1f74f9c83091982dd3c6a71572f5d0", "bd125005bd0e036fe2ecf7310b9cf106e7f55692e7f1af1d218317d4bc6f6e5c", "bb91f44f8da00e12e6b1b3ff4d71c8590aefd625cfd540c7c6e3bf26aafb74d5", "9fa69c328ba4b75206ea32c10777e3217fe45428daf43e7cc3caad680e4c1265", "e0ac77fc2b2a91d9e5c1702c418a0c98ffc8a21673e09d58515d8508c9aad56b", "dad800e23ee3caadeeb707770f8eca2d7ca0e543d977ae3ebd0b48f820ae0976", "df9da4d0f9b627c966f8c2090b371ad84bc816a0f9ba60c188604c31253da3f1", "80fd13d89d9932b7fda9f4f2ff5c667b192b9985b49be9060fb186c5cece6bde", "26bbc7b5a1c6c4711d6b8226d0692a6cef9ff6282f06c04aa3811934d42752fe", "9c9095a6cc73adb64e2596460c625c21d0970eec244f22f56415fd607f498973", "d29736b4a03166201aafbdd33225f7a61947d789b75cdbf2c3d9d1f4c54449c2", "ab3b9f91b947c4ce3458dd3d83f1b870d9c315633c152fe9d4d3ad7e66d023a7", "396b0e73d44da1256e24b0e34e1080f29cee2767f0eac7d3d9c7872ccceb146f", "ed9865040d33c75ba97bda429e2b4a010c2c371cf7f9a459da7e0a471afd1df4", "d9a4553382bed148e498eccf676a4cfe5e5b1ce03d5e7f86b1d28f780149e3a1", "6bdc5687525cb64b766bb1a6e50ec58caf3830b71beb2fb773bb0820cdd1ae0c", "a10715623d789791d15d74bf454def25a1c7ce545df026e9123bb2617810f6db", "fd1a5478304d235d475c0065ccb4f661c1af3f63a33c0197daee504865c29733", "c0c0d51e8f1e731cf5c5123c9da0fc4c245a6c27ed429a9362d9b540c0e6c48f", "239ceb7f80bf7ce15aa49102ab1e861dd840fc2574e7a0fa35043d5393ab3592", "3a410a6c210f57071d41d289b9ea27f25885ffe0ae16e3d3423a611f9df209f8", "7486c31a7a4f5d9a7c4d0fbc9eda8f2b8b19fe1788c321a5d92088cdf8aac923", "a81c1172df0f17e245f2ddcabbe53fe753fa8745996fa7b43b151712f5841014", "3a69ff77fa03a29503d5be4f34448af73a313a2a00c35492b0fcbb92b0b01930", "625e4a594049cb62d98f7f9f6cdb655d5bf621782ccbb0dc33658c6b4d013a0d", "bd16f11fa38ef3113886cc76d3965f6d02aaa04117d569f9ee7730ecbbc9b8e4", "af755b2999930c4359e4f440a7bfd4cd43e1d981f531c4f38c2240313213c163", "28b085f5050b3e3d1ffdd27192576c20151da2e54d2203562fddd5eb03dff930", "50cc09ca02990b5b5db73c1f526ee8f386a6fa9dc9e9d86b6b0e8f6b551e7c33", "ac27d529b2123a9e04de6d620ca31215c321fc2f3fe5e5b7dba77ac20e6ea8c7", "e9511b42edb30e45a71318c5cea87e1932c37409be877da542529098d8c6a4b7", "8188de3905fd14df6ebb301f42b24cf8232b61493ac41145643cd6383ba7c03d", "6c9c2005f577447e65360a44259d7404ca3fd7693a41c686c5622b6dc0df4aeb", "2823406c68a1c0a25efa4a454b1320e91f78e0a2021c41c024470ae9f3b1c98d", "f2d147c28d6eb6413075ae87f25d06c4b4db7a43cabc35e5fc0cfdb10cd34b3e", "04807df1a54268ae894eb6d17e7f868d95fc47867b6e4ec446e95df1613ff85d", "13e12bfa8828643489817babf7e584107d32e7cff0e4816cc5354c3c783a8eb2", "a618227bb93153c0e631072131b81fecce4545ab821f03dcb28bc24fcf45210c", "4c90ebd1d1d7fd09ea005d2d4578dff310cfea8f65aa99b810121e1ed7e3b597", "e9714be97f0e46aefe3582f990da84196c92caaf658a8ed528df45c2491d6a6b", "e6993f9c78aea714245ec542cfc52818de3baf411bdc8b8dd25c44484d6cf22b", "3a8d4bd2c22ce6d84b0272fe03c9fa4d3796565f0291348894f218688222054f", "2d256fa789af02d0e601baf1308ccfc4d5fe8a99b222144086a0fc7cfe5db538", "b04fd61626f76929ead1a861d9e8cc1609e0117074c7c8d64f502463675806f0", "264664f0124dd78fa3d9d1c2d2b9276e7c576688b669760301e5bdf8054b8b20", "9f57cf5919dd7bab4afd501476d3654f252a641a0b798ea9a0faed4a7c57a0b0", "b7afdf7e2980feca9f436bf6fe2e42d2712d8551412c1e835986c50a63274aca", "b9462a607bbc53f2d9138269b69e3cd3944145795a953be46cd88536e866d5ec", "20b0ef7a109d9cb48bae118a1b360fda8a506dc9e92e43feddd598ee521f762b", "e20848fd405bad5df0044f31fd0f4d51b7ba0c4555659b944b8edf0a1d536fe7", "9bb8fec9d4a20d26e72e865237a65410053209b9c8d8c9be2734310a14dbbcb0", "3e3ba8e68d73b36f82172c7d4f8016569bce5ce8abf086d7aefed354620ecdc6", "a1e562cdeca42d5d7dd3a6de118db0b5056b1a58cbd34d727ff64d6b83b10a3f", "67f7128cd8621a94b979704951d410e5c5c80352ace1cdf471b8aeb7dc26fba2", "f7c3c91a07a80cf91b449f16cb587ece74dfda68dd0c79a1c0ae6a36ee8be509", "283e3317470fc5bfd21ee2d584ce9f8d4d33efdbd2b7c5c46e86f2dce2f8f8d6", "bc47a4a79e88c47c0a61161593b99926d7ade2b9b66fda9e54e2f3a524747ddb", "e9529483eef4e71dd123184e27b2997834d55db99e84ee3ddbac0a14b39bd5e8", "6ffa5a38970de3b92933380ee2a65a002a7c55552055b35648fc2d8194bd65d8", "eadae8fa42b73ebd35a163cfd78289cdc30ece8d96429c2b9a6133ff278b0909", "196775117b9e0a5e300d20441736a195170d7d6840e2b21a7e74fce0dcd976cd", "25cb51d6a87be7836f90cd4daa8242860968e488bd0c213d0c70dc7ee56e4ea0", "8e26b232b4a6173714b5ce603eef61294711e24c01bc321a29499922b8b585a7", "4c0d6b12b1984d7076a80bcde4e8543fe4bd019a0a7c27f553b99336dae3a3fb", "196f158be59383627d68fb598c804fec63ac1bfbb315e06b7b6c5c5c965d447e", "3853205c389eb56d991e16c6eeabc9463e2035728d51e939cd2f7d4fb9fc5d3d", "7eb63f2e4f0d1eb3dee8b9135822630dce91a1689bfcaeeb6fecb4dabba3bf53", "02fc3ad98670d2e7603c8ac55248a36d558d915e791b0a2f77c307c39616e135", "6760065aca495c615271c4b5fc981c41322dac4857681dba110c8b10ef9ddfee", "d353ffe5a0d154c7c3d6b81075899fbc3661cd390cae9491029c33e937ce494c", "7c8826c8a507cfded7d7d2b1a3489d7f5d9702959e0f6198de5f2f1e683803bb", "f9cb9f7a4f84f196858e388731101632f2db54e3417f85f6a76948410583313d", "b62f6fe0cbd15550a54005edb1ccb7e982e8f64b517a87c1d4aeac958660484c", "fe9f9aa805a4491a4d74c318576b3d7de513b623395e194b715c145400c992db", "ed0f011f20c4c2930b0d618cad9930e3a66b190e99b81fc26c18f62b145f448c", "db1391ef7ec2d2a0442eee5b80fb08b266ef8db4299d14680adfe3239df9d4be", "219392be125203a3b7fc933b93916a03331118eed2978bee227e780e6ff6e9ed", "f9507264830a98447fd1eae114efb66929edc1412e0207a28ba75dedb4fded31", "744cef9ca6ff5cfeb09a89a84393b05000ad469d0f515043d200b8b6990af348", "27d92e4d23ffd0b10c07462551fdbb379acf40b948c5a93d901b1aef3c2e216f", "721320674959cca8bfe1c6ba78d092a98aec05a2022dceb4b609dd045997f3e6", "5b78fc8bbedcfb9e772af4e091b2328e04a85b23c83d1693b296247a219701c8", "ed6e75415ea92241c63a3a20d653229a11b991b3ee5d5c0837815dbdcebebe6d", "70505484f0345cf88c1b1d96224627e6d83d20c58235d90992ec7b3059855c46", "367d8953c373959d9231d49971350d564e2eb808c7fdf5c2ee24e4e2e6f626a0", "0895de2a6a13a53e0e52b1a2544684e491258d492aded83523ffd359fd6502f0", "ae729187c982659bb3e52baf04e3f35701765910045e2ed45f00bae50cfa1233", "b230c5a0505d695d44c5352375d0d5ab779bf67d601d8874fa1b1597933ff8f4", "bda6f3fab4dadec057528ad2f0c47224bdd71c6bdde8476d61f9266c9fd2689e", "ee3186fa36316954ebf628ef791604b519e5709e8e00e8431c742bdf4024527d", "abd33f089205927670eb3cf9883f9c16ca285754537bdb35d1060a922a1608da", "24a066fd24a5dbe58e93016646fd348e951fd092647f79ed2738a3ca1f49945c", "ab2c294a6270e2aa2e0b9e66453c811e20e71521b6edff0a471efe3cc233fa51", "c7b6344cfa8bc27df1a0985dc182cba5bcf5fe7754ff28a9703c92766e993c39", "92e8194053bb4b03f0f766fe39f9469f272a0c3bd77d2ed5d030366c94478e3c", "9dff81d7e7e8dc51e919cf920211f56553858348ae91368a12950a0d8c8ea56d", "2b275a02a92f9906ef13af33f8352dc7b034a6ec35b93aacea20e4949e11b721", "f217045e7ea1ce76d70dc15624fa13e3e7b6cc1ff6b0c744b209881dd2257812", "344b44cd40ad769e208a282279f11349273e15ced7384170c2fb5232063d09ae", "2ccb39de25d26af2574b4f222796dc7705744b9366ce5b9b780687b0e0eda96a", "05311a242dfaf756b069b0b71779723093721dfa3290fc247cae14db3615776f", "c7cbe58b6dd0e3f92edbd39f7f7514c6d26fb97e2eb9b1f48b6b9d93eb890fa3", "8818dd8f548411c16a62541bd3d5558ab7d3f27e34ad4f90eeb31093cc18543d", "a915eb29a47259746d4cad0e95a2530543ba8b375358746aa6ac85ed056f2994", "879c78e6326648716f832449c956bad9fb194e0fe9f89b442c357c6cccbc6649", "45ef315305b5d22da51519cf4c0ded52b27bbfb9bbafcdaa54754769a58512fb", "819f17d839136a960fd376be8aad9740379096321eb451db5a73c2be904d8700", "d8cac79f6654aec335f7ddd91f7037bd9325c07b9e441c8a954c9c00760d5d6e", "792cfc0e44cc98190df34a182780c556b5763d1900913f257d0bcfd28287c74d", "a6a177f13e3d4c775b536f5d194f0a62f6f3094b71f1b56fdb8bd1a361a6b64c", "a5cf27524fee71c5bb63b66bd749e95b29f9796b3e6d36a6a920ce8d63e594fa", "17c345f3f919d80ecf9ee9e369439d5c1ffae864ac982826b2ffed1ed9be08fc", "940d4f00c25fa5018061f4dec4d8cf98441db7d81f3e427a2226752a8407493b", "2924bccb69e7021f4234e1db78614044c7752051d0cf2b4f897576190b9a171c", "c203f1eae139cf6dd30677cce027c8702e85edac43cbb000651066104a5cc1eb", "426610291ce48d6d6f0cb4044a71db67c843b91df49b5d48d78033927acee2cf", "919b9c9b14a09c04d76f7e4137a0eb6408deb720c2159d441c6c7dbbe5470f1b", "10663262049fdf0cf55d5d012a82dcffcccd70463e71ed8258919d9d67127dfc", "bd15157d51209ee30c820375ffa4fb15a932ed97d0cd5a4b5c4ea7a2c8ed21a5", "894f641cbaf71623eb1363e5b9e2247770cc0a09e143ef65c435a4b8158511e6", "13bce5aa4cdc7409b7868de7625bc799f87422828f143d6d3f4ff0572203c29b", "a5f124c224330b7aa147bc92c8973cd1de24e956931b6806db9b181dbbbbbd85", "76ca66e9375f41f393833b95a345ba95f6fe8cd30edd7f080f6b22e18bf769fb", "d92600c958746a9b4eff5648cf369086193426510bf894be53b85bc1d2ba60af", "49bd7497c5298ce16ca8c8fad18e052c72903b9562e0e230b23c3a6afd0eaff5", "0f051246faaedde49a108b45486a36bc915c63003ce3c05d149a5d03b941f6d0", "2006a57b86fefed5665c9624f2c32893177db91ccdf6a1206166e8b5ddc33cd8", "9825e33ea12adf8d01180e47c0c50eb14aa302c16f1527c61d31faa3e006ecfa", "bc10f214e88789f38b8705b10d79124ee38e773b46244c8fe6ca030e5e9df13e", "8a3ee0b9b5a7927f183bbe6c6a021b4e73ab98e3354c08856c3a1c4c3d7a4718", "1b7736a126ec2ae5ce721c7ba5122879ab982de0714c849ce27ce39f0b4dc19a", "04ff32a87c3583f278c3b9cac6037b99886e2c4847ca733d074cb0db2d1901ee", "070e5c0819dfbe7d355d0fd7100b5e56d8fdf08ee6ad64293844d1fc51d58cb4", "6b207ad571af56e0f385f345b48de50a49b3b97a6ce4a7b6e5b4a7a7682da711", "5b83d3eb0d1b07c559e8f573dec94a426fcd1df381c697e866d934cc05e1001d", "cb0d90b76e7ccbcceb3b4d51bcaccb4486083cfed76d208697d512c668530770", "fb39aff400a2176c98ba7c7cb9bb08d64181b04939111f1e45a534be9abbdad4", "9d71afc8e8325aca454a3db50e1757bb31fa83de9ff873c323a032e8fd369d05", "bcc27944786f114bbb37f6100847a815a5f40f35fba65709d17da7aeb634b08e", "3d12bd93eab5773ee810f0027ee1d07e7d2a603bc5cdc366895f0a23287ad73d", "375526690b894342bd735703d87765df32cd82c438475e96f324d6bfe273c4f4", "e284ae2ec387cdd81cc6a79c240c3b7f07b44cebb2e7cb85a08ab30f3e31f6f0", "a5148408521b5d2777bd128a32bcc8d8a4a2670d15e4152d8a64c18218fed656", "3df1cf6172829a8a2359891995e54b17975a713fc2187ad734699fa945cb9186"], APPKEY = 'majoodah-shahadat', KEY = 'mj_shahadat_act';
  const api = { active: false };
  async function sha(s) { const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join(''); }
  function norm(c) { const s = String(c || '').toUpperCase(); const m = s.match(/CRT[\s\-_]*([A-Z0-9]{4})[\s\-_]*([A-Z0-9]{4})/); return m ? ('CRT' + m[1] + m[2]) : s.replace(/[^A-Z0-9]/g, ''); }
  function setActive(v) { api.active = v; const b = document.getElementById('mjActBtn'); if (b) { b.textContent = v ? '✓ مُفعّل' : 'تفعيل التحميل'; b.classList.toggle('on', v); } }
  api.watermark = function (canvas) {
    const ctx = canvas.getContext('2d'), w = canvas.width, h = canvas.height;
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.translate(w / 2, h / 2); ctx.rotate(-0.42);
    ctx.font = '800 ' + Math.round(w / 9) + 'px "IBM Plex Sans Arabic", Tahoma, sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(10,109,115,.16)';
    ctx.fillText('معاينة — مجودة', 0, 0);
    ctx.font = '700 ' + Math.round(w / 34) + 'px "IBM Plex Sans Arabic", Tahoma, sans-serif';
    ctx.fillStyle = 'rgba(10,109,115,.28)'; ctx.fillText('فعّل من majoodah.com لإزالة العلامة', 0, Math.round(w / 12));
    ctx.restore();
  };
  api.open = function () { document.getElementById('mjAct').hidden = false; setTimeout(() => document.getElementById('mjCode').focus(), 50); };
  function init() {
    try { const h = localStorage.getItem(KEY); if (h && HASHES.indexOf(h) >= 0) setActive(true); } catch (e) {}
    document.getElementById('mjActBtn').addEventListener('click', () => { if (!api.active) api.open(); });
    document.getElementById('mjClose').addEventListener('click', () => { document.getElementById('mjAct').hidden = true; });
    document.getElementById('mjForm').addEventListener('submit', async (e) => {
      e.preventDefault(); const m = document.getElementById('mjMsg'), c = norm(document.getElementById('mjCode').value);
      if (c.length < 8) { m.className = 'mj-msg err'; m.textContent = 'اكتب الكود كاملاً كما وصلك، مثل CRT-7K3P-Q9WM.'; return; }
      try { const h = await sha(APPKEY + ':' + c); if (HASHES.indexOf(h) >= 0) { try { localStorage.setItem(KEY, h); } catch (e) {} setActive(true); m.className = 'mj-msg ok'; m.textContent = 'تم التفعيل — حمّل شهاداتك الآن بلا علامة.'; setTimeout(() => { document.getElementById('mjAct').hidden = true; }, 1500); } else { m.className = 'mj-msg err'; m.textContent = 'الكود غير صحيح. تأكد من كتابته كما وصلك في رسالة الطلب.'; } } catch (err) { m.className = 'mj-msg err'; m.textContent = 'افتح الصفحة في متصفح حديث لإتمام التفعيل.'; }
    });
    // لصق قائمة أسماء: كل سطر اسم، وبقية الحقول من النموذج
    document.getElementById('mjPasteAdd').addEventListener('click', () => {
      const ta = document.getElementById('mjPaste');
      const names = ta.value.split(/\r?\n/).map(s => s.split(/\t|,|،/)[0].trim()).filter(Boolean);
      if (!names.length) { toast('الصق الأسماء أولاً — اسم في كل سطر', 'error'); return; }
      const base = { school: document.getElementById('fSchool').value.trim(), subject: document.getElementById('fSubject').value.trim(), grade: document.getElementById('fGrade').value.trim(), instructor: document.getElementById('fInstructor').value.trim(), date: document.getElementById('fDate').value };
      names.forEach(n => state.students.push(Object.assign({ id: uid(), name: n }, base)));
      ta.value = ''; saveState(); renderNamesTable(); updateGenStats();
      toast('أُضيف ' + names.length + ' اسماً — كل اسم شهادة', 'success');
    });
    // تنبيه قبل التصدير بلا تفعيل
    ['btnDownloadPDF', 'btnDownloadImages'].forEach(id => { const b = document.getElementById(id); if (b) b.addEventListener('click', () => { if (!api.active) toast('تُحمَّل الآن بعلامة «معاينة» — فعّل بالكود لإزالتها', 'info'); }, true); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
  return api;
})();
