// src/translations.js

const translations = {
    sidebar: {
      dashboard: {
        en: "Dashboard",
        ar: "لوحة التحكم",
        he: "לוח ניהול",
      },
      businesses: {
        en: "Businesses",
        ar: "الأنشطة",
        he: "עסקים",
      },
      services: {
        en: "Services",
        ar: "الخدمات",
        he: "שירותים",
      },
      bookings: {
        en: "Bookings",
        ar: "حجز المواعيد",
        he: "הזמנות תורים",
      },
      calendar: {
        en: "Calendar",
        ar: "التقويم",
        he: "לוח שנה",
      },
      addBusiness: {
        en: "Add Business",
        ar: "إضافة نشاط",
        he: "הוסף עסק",
      },
      logout: {
        en: "Logout",
        ar: "تسجيل الخروج",
        he: "התנתק",
      },
      businessInfo: {
        en: "Business Info",
        ar: "معلومات النشاط",
        he: "פרטי העסק",
      },
      settings: {
        en: "Settings",
        ar: " الإعدادات",
        he: "הגדרות",
      },
    },

    header: {
      title: {
        en: "Admin Dashboard",
        ar: "لوحة التحكم",
        he: "לוח ניהול",
      },
      ownerTitle: {
        en: "Dashboard",
        ar: "لوحة التحكم",
        he: "לוח ניהול",
      }

    },

    pageTitles: {
      "/admin/Dashboard": {
        en: "Admin Dashboard",
        ar: "لوحة التحكم",
        he: "לוח ניהול",
      },
      "/owner/Dashboard": {
        en: "Dashboard",
        ar: "لوحة التحكم",
        he: "לוח ניהול",
      },
      "/admin/businesses": {
        en: "Businesses",
        ar: "الأعمال",
        he: "עסקים",
      },
      "/owner/profile": {
        en: "Business Info",
        ar: "معلومات العمل",
        he: "פרטי העסק",
      },
      "/admin/add-business": {
        en: "Add Business",
        ar: "إضافة عمل",
        he: "הוספת עסק",
      },
      "/owner/bookings": {
        en: "Bookings",
        ar: "حجز المواعيد ",
        he: "הזמנות תורים",
      },
      "/owner/calendar": {
        en: "Calendar",
        ar: "رزنامة",
        he: "לוח שנה",
      },
      "/owner/settings": {
        en: "Settings",
        ar: "الإعدادات",
        he: "הגדרות",
      },
      "/owner/services": {
        en: "Services",
        ar: "الخدمات",
        he: "שירותים",
      },
    },

    modals: {
      logoutTitle: {
        en: "Confirm Logout",
        ar: "تأكيد تسجيل الخروج",
        he: "אישור יציאה",
      },
      logoutMessage: {
        en: "Are you sure you want to log out?",
        ar: "هل أنت متأكد أنك تريد تسجيل الخروج؟",
        he: "אתה בטוח שברצונך להתנתק?",
      },
    },

    servicesPage: {
      addNew: {
        en: "Add New Service",
        ar: "إضافة خدمة جديدة",
        he: "הוסף שירות חדש",
      },
      name: {
        en: "Name",
        ar: "الاسم",
        he: "שם",
      },
      description: {
        en: "Description",
        ar: "الوصف",
        he: "תיאור",
      },
      price: {
        en: "Price",
        ar: "السعر",
        he: "מחיר",
      },
      duration: {
        en: "Duration",
        ar: "المدة",
        he: " זמן",
      },
      category: {
        en: "Category",
        ar: "الفئة",
        he: "קטגוריה",
      },
      bookable: {
        en: "Bookable",
        ar: "قابل للحجز",
        he: "ניתן להזמנה",
      },
      status: {
        en: "Status",
        ar: "الحالة",
        he: "סטטוס",
      },
      actions: {
        en: "Actions",
        ar: "الإجراءات",
        he: "פעולות",
      },
      active: {
        en: "Active",
        ar: "فعّال",
        he: "פעיל",
      },
      inactive: {
        en: "Inactive",
        ar: "غير نشط",
        he: "לא פעיל",
      },
      edit: {
        en: "Edit",
        ar: "تعديل",
        he: "ערוך",
      },
      toggle: {
        en: "Toggle Status",
        ar: "تبديل الحالة",
        he: "החלף סטטוס",
      },
        
      save: {
        en: "Save",
        ar: "حفظ",
        he: "שמור",
      },
      cancel: {
        en: "Cancel",
        ar: "إلغاء",
        he: "בטל",
      },
      addService: {
        en: "Add Service",
        ar: "إضافة خدمة",
        he: "הוסף שירות",
      },
      updateService: {
        en: "Update Service",
        ar: "تحديث الخدمة",
        he: "עדכן שירות",
      },
      serviceUpdatedSuccessfully: {
        en: "Service updated successfully",
        ar: "تم تحديث الخدمة بنجاح",
        he: "השירות עודכן בהצלחה",
      },
      serviceUpdatedFailed: {
        en: "Failed to update service",
        ar: "فشل في تحديث الخدمة",
        he: "עדכון השירות נכשל",
      },
      serviceAddedSuccessfully: {
        en: "Service added successfully",
        ar: "تم إضافة الخدمة بنجاح",
        he: "השירות נוסף בהצלחה",
      },
      serviceAddFailed: {
        en: "Failed to add service",
        ar: "فشل في إضافة الخدمة",
        he: "הוספת שירות נכשלה",
      },
      serviceStatusUpdatedSuccessfully: {
        en: "Service status updated successfully",
        ar: "تم تحديث حالة الخدمة بنجاح",
        he: "סטטוס השירות עודכן בהצלחה",
      },
      serviceStatusToggleFailed: {
        en: "Failed to toggle service status",
        ar: "فشل في تحديث حالة الخدمة",
        he: "עדכון סטטוס השירות נכשל",
      },
      serviceExists: {
        en: "Service with this name already exists",
        ar: "الخدمة بهذا الاسم موجودة بالفعل",
        he: "שירות עם שם זה כבר קיים",
      },
      serviceFetchEror: {
        en: "Error fetching services",
        ar: "خطأ في جلب الخدمات",
        he: "שגיאה בטעינת השירותים",
      },
      searchPlaceholder: {
        en: "Search by name",
        ar: "ابحث بالاسم",
        he: "חפש לפי שם",
      },
      filterCategory: {
        en: "Filter by category",
        ar: "تصفية حسب الفئة",
        he: "סנן לפי קטגוריה",
      },
      true: { en: "True", ar: "نعم", he: "כן" },
      false: { en: "False", ar: "لا", he: "לא" },
    },
    bookingsPage: {
      searchLabel: {
        en: "Search Bookings",
        ar: "بحث عن الحجوزات",
        he: "חיפוש הזמנות",
      },
      searchPlaceholder: {
        en: "🔎 Search by name or phone",
        ar: "🔎 ابحث بالاسم أو الهاتف",
        he: "🔎 חפש לפי שם או טלפון",
      },
      filterLabel: {
        en: "Filter",
        ar: "تصفية",
        he: "סינון",
      },
      addBooking: {
        en: "Add Booking",
        ar: "إضافة حجز",
        he: "הוסף הזמנה",
      },
      cancel: {
        en: "Cancel",
        ar: "إلغاء",
        he: "ביטול",
      },
      save: {
        en: "Save Booking",
        ar: "حفظ الحجز",
        he: "שמור הזמנה",
      },
      all:{
        en: "All",
        ar: "الكل",
        he: "הכל",
      },
      pending: {
        en: "Pending",
        ar: "قيد الانتظار",
        he: "ממתין",
      },
      confirmed: {
        en: "Confirmed",
        ar: "مؤكد",
        he: "מאושר",
      },
      cancelled: {
        en: "Cancelled",
        ar: "ملغي",
        he: "בוטל",
      },
      status: {
        en: "Status",
        ar: "الحالة",
        he: "סטטוס",
      },
      customerNamePlaceholder: {
        en: "Customer Name",
        ar: "اسم الزبون",
        he: "שם לקוח"
      },
      phonePlaceholder: {
        en: "Phone",
        ar: "رقم الهاتف",
        he: "טלפון"
      },
      servicePlaceholder: {
        en: "Service",
        ar: "الخدمة",
        he: "שירות"
      },
      date: {
        en: "Date",
        ar: "تاريخ",
        he: "תאריך",
      },
      time: {
        en: "Time",
        ar: "الوقت",
        he: "שעה",
      },
      loadingBookings: {
        en: "Loading bookings...",
        ar: "جارٍ تحميل الحجوزات...",
        he: "טוען הזמנות...",
      },
      noBookings: {
        en: " No bookings for this day.",
        ar: " لا توجد حجوزات لهذا اليوم.",
        he: " אין הזמנות ליום זה.",
      },
      dateTime:{
        en: "Date & Time",
        ar: "التاريخ والوقت",
        he: "תאריך ושעה",
      },
      edit:{
        en: "Edit",
        ar: "تعديل",
        he: "ערוך",
      },
      delete:{
        en: "Delete",
        ar: "حذف",
        he: "מחק",
      },
      confirm:{
        en: "Confirm",
        ar: "تأكيد",
        he: "אשר",
      },
      paginationShowing: {
        en: "showing",
        ar: " يظهر",
        he: "מציג",
      },
      paginationSummary: {
        en: "Showing {from} to {to} of {total} entries",
        ar: "عرض من {from} إلى {to} من {total} إدخالات",
        he: "מציג {from} עד {to} מתוך {total} רשומות"
      },
      selectService: {
        en: "Select Service ",
        ar: "اختر الخدمة  ",
        he: "בחר שירות",
      },
      toastNotValidcustomerName: {
        en: "Customer name must be less than or equal to 30 characters, including ONLY letters and spaces.",
        ar: "يجب أن يكون اسم العميل أقل من أو يساوي 30 حرفًا، ويشمل فقط الحروف والمسافات.",
        he: "שם הלקוח חייב להיות עד 30 תווים, כולל רק אותיות ורווחים.",
      },
      toastNotValidPhone: {
        en: "Phone number must be 10 digits starting with 05, and the third digit must be 0-5, 8, or 9.",
        ar: "يجب أن يكون رقم الهاتف 10 أرقام يبدأ بـ 05، ويجب أن يكون الرقم الثالث 0-5 أو 8 أو 9.",
        he: "מספר הטלפון חייב להיות 10 ספרות המתחילות ב-05, והספרה השלישית חייבת להיות 0-5, 8 או 9.",
      },
      toastNotValidDate: {
        en: "Booking must be for now and within the next 6 months.",
        ar: "يجب أن يكون الحجز الآن وخلال الأشهر الستة القادمة.",
        he: "ההזמנה חייבת להיות מהיום ועד שישה חודשים קדימה.",
      },      
      toastNotValidTime: {
        en: "Booking time must be between {openingTime} and {closingTime}.",
        ar: "يجب أن يكون وقت الحجز بين {openingTime} و {closingTime}.",
        he: "זמן ההזמנה חייב להיות בין {openingTime} ל-{closingTime}.",
      },
      selectStatus:{
        en: "Select Status",
        ar: "اختر الحالة",
        he: "בחר סטטוס",
      }
    },
    calendarPage: {
      today: {
        en: "Today",
        ar: "اليوم",
        he: "היום",
      },
      editBooking: {
        en: "Edit Booking",
        ar: "تعديل الحجز",
        he: "ערוך הזמנה",
      },
      createBooking: {
        en: "Create Booking",
        ar: "إنشاء حجز",
        he: "צור הזמנה",
      },
      update: {
        en: "Update",
        ar: "تحديث",
        he: "עדכן",
      },
      create: {
        en: "Create",
        ar: "إنشاء",
        he: "צור",
      },
      pending: {
        en: "Pending",
        ar: "قيد الانتظار",
        he: "ממתין",
      },
      confirmed: {
        en: "Confirmed",
        ar: "مؤكد",
        he: "מאושר",
      },
      cancelled: {
        en: "Cancelled",
        ar: "ملغي",
        he: "מבוטל",
      },
      customerName: {
        en: "Customer Name",
        ar: "اسم العميل",
        he: "שם הלקוח",
      },
      phone: {
        en: "Phone",
        ar: "الهاتف",
        he: "טלפון",
      },
      service: {
        en: "Service",
        ar: "الخدمة",
        he: "שירות",
      },
      date: {
        en: "Date",
        ar: "التاريخ",
        he: "תאריך",
      },
      time: {
        en: "Time",
        ar: "الوقت",
        he: "שעה",
      },
      delete: {
        en: "Delete",
        ar: "حذف",
        he: "מחק",
      },
      close: {
        en: "Close",
        ar: "إغلاق",
        he: "סגור",
      },
      selectService: {
        en: "Select Service",
        ar: "اختر الخدمة",
        he: "בחר שירות",  
      },
      viewOptions: {
        day: { en: "Day", ar: "يوم", he: "יום" },
        week: { en: "Week", ar: "أسبوع", he: "שבוע" },
        month: { en: "Month", ar: "شهر", he: "חודש" },
        agenda: { en: "Agenda", ar: "الأجندة", he: "אג׳נדה" },
      },
      startTime:{
        en: "Start",
        ar: "بداية",
        he: "התחלה",
      },
      endTime:{
        en: "End",
        ar: "نهاية",
        he: "סיום",
      },
      minutes:{
        en: "Minutes",
        ar: "دقائق",
        he: "דקות",
      }
      

    }

    
  };
  
  export default translations;