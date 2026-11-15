export interface TimeSlot {
  day: string;
  start: string;
  end: string;
  room: string;
  startMinutes?: number;
  endMinutes?: number;
}

export interface OfferedSectionItem {
  id?: number;
  courseCode: string;
  sectionNumber: string;
  courseTitle: string;
  credits: number;
  facultyInitial: string;
  facultyName: string;
  availableSeats?: number;
  scheduleText: string;
  scheduleJson?: string;
  slots: TimeSlot[];
  semester?: string;
}

export const REAL_SEU_OFFERED_SECTIONS: OfferedSectionItem[] = [
  {
    "courseCode": "CSE355",
    "sectionNumber": "3",
    "courseTitle": "Image Processing",
    "credits": 3.0,
    "facultyInitial": "JAR",
    "facultyName": "Mst. Jesiara Khatun",
    "scheduleText": "MON # 08:30 ~ 09:50 @ SEU527 / WED # 08:30 ~ 09:50 @ SEU527",
    "slots": [
      {
        "day": "MON",
        "start": "08:30",
        "end": "09:50",
        "room": "SEU527",
        "startMinutes": 510,
        "endMinutes": 590
      },
      {
        "day": "WED",
        "start": "08:30",
        "end": "09:50",
        "room": "SEU527",
        "startMinutes": 510,
        "endMinutes": 590
      }
    ]
  },
  {
    "courseCode": "CSE355",
    "sectionNumber": "4",
    "courseTitle": "Image Processing",
    "credits": 3.0,
    "facultyInitial": "JAR",
    "facultyName": "Mst. Jesiara Khatun",
    "scheduleText": "SUN # 13:30 ~ 14:50 @ SEU333 / TUE # 13:30 ~ 14:50 @ SEU333",
    "slots": [
      {
        "day": "SUN",
        "start": "13:30",
        "end": "14:50",
        "room": "SEU333",
        "startMinutes": 810,
        "endMinutes": 890
      },
      {
        "day": "TUE",
        "start": "13:30",
        "end": "14:50",
        "room": "SEU333",
        "startMinutes": 810,
        "endMinutes": 890
      }
    ]
  },
  {
    "courseCode": "CSE355",
    "sectionNumber": "5",
    "courseTitle": "Image Processing",
    "credits": 3.0,
    "facultyInitial": "MAHB",
    "facultyName": "Mahbub Hasan",
    "scheduleText": "SUN # 08:30 ~ 09:50 @ SEU527 / TUE # 08:30 ~ 09:50 @ SEU527",
    "slots": [
      {
        "day": "SUN",
        "start": "08:30",
        "end": "09:50",
        "room": "SEU527",
        "startMinutes": 510,
        "endMinutes": 590
      },
      {
        "day": "TUE",
        "start": "08:30",
        "end": "09:50",
        "room": "SEU527",
        "startMinutes": 510,
        "endMinutes": 590
      }
    ]
  },
  {
    "courseCode": "CSE355",
    "sectionNumber": "6",
    "courseTitle": "Image Processing",
    "credits": 3.0,
    "facultyInitial": "MAHB",
    "facultyName": "Mahbub Hasan",
    "scheduleText": "MON # 15:00 ~ 16:20 @ SEU419 / WED # 15:00 ~ 16:20 @ SEU419",
    "slots": [
      {
        "day": "MON",
        "start": "15:00",
        "end": "16:20",
        "room": "SEU419",
        "startMinutes": 900,
        "endMinutes": 980
      },
      {
        "day": "WED",
        "start": "15:00",
        "end": "16:20",
        "room": "SEU419",
        "startMinutes": 900,
        "endMinutes": 980
      }
    ]
  },
  {
    "courseCode": "CSE355",
    "sectionNumber": "7",
    "courseTitle": "Image Processing",
    "credits": 3.0,
    "facultyInitial": "MAHB",
    "facultyName": "Mahbub Hasan",
    "scheduleText": "SUN # 10:00 ~ 11:20 @ SEU526 / TUE # 10:00 ~ 11:20 @ SEU526",
    "slots": [
      {
        "day": "SUN",
        "start": "10:00",
        "end": "11:20",
        "room": "SEU526",
        "startMinutes": 600,
        "endMinutes": 680
      },
      {
        "day": "TUE",
        "start": "10:00",
        "end": "11:20",
        "room": "SEU526",
        "startMinutes": 600,
        "endMinutes": 680
      }
    ]
  },
  {
    "courseCode": "CSE355",
    "sectionNumber": "8",
    "courseTitle": "Image Processing",
    "credits": 3.0,
    "facultyInitial": "MNAR",
    "facultyName": "Namirah Rasul",
    "scheduleText": "SUN # 08:30 ~ 09:50 @ SEU510 / TUE # 08:30 ~ 09:50 @ SEU510",
    "slots": [
      {
        "day": "SUN",
        "start": "08:30",
        "end": "09:50",
        "room": "SEU510",
        "startMinutes": 510,
        "endMinutes": 590
      },
      {
        "day": "TUE",
        "start": "08:30",
        "end": "09:50",
        "room": "SEU510",
        "startMinutes": 510,
        "endMinutes": 590
      }
    ]
  },
  {
    "courseCode": "CSE355",
    "sectionNumber": "9",
    "courseTitle": "Image Processing",
    "credits": 3.0,
    "facultyInitial": "MNAR",
    "facultyName": "Namirah Rasul",
    "scheduleText": "SUN # 13:30 ~ 14:50 @ SEU332 / TUE # 13:30 ~ 14:50 @ SEU332",
    "slots": [
      {
        "day": "SUN",
        "start": "13:30",
        "end": "14:50",
        "room": "SEU332",
        "startMinutes": 810,
        "endMinutes": 890
      },
      {
        "day": "TUE",
        "start": "13:30",
        "end": "14:50",
        "room": "SEU332",
        "startMinutes": 810,
        "endMinutes": 890
      }
    ]
  },
  {
    "courseCode": "CSE355",
    "sectionNumber": "10",
    "courseTitle": "Image Processing",
    "credits": 3.0,
    "facultyInitial": "NAAO",
    "facultyName": "Md. Nahid Anam Opu",
    "scheduleText": "SUN # 15:00 ~ 16:20 @ SEU321 / TUE # 15:00 ~ 16:20 @ SEU321",
    "slots": [
      {
        "day": "SUN",
        "start": "15:00",
        "end": "16:20",
        "room": "SEU321",
        "startMinutes": 900,
        "endMinutes": 980
      },
      {
        "day": "TUE",
        "start": "15:00",
        "end": "16:20",
        "room": "SEU321",
        "startMinutes": 900,
        "endMinutes": 980
      }
    ]
  },
  {
    "courseCode": "CSE355",
    "sectionNumber": "11",
    "courseTitle": "Image Processing",
    "credits": 3.0,
    "facultyInitial": "RKM",
    "facultyName": "Md. Rakibul Islam",
    "scheduleText": "THU # 15:00 ~ 16:20 @ SEU333 / SAT # 15:00 ~ 16:20 @ SEU333",
    "slots": [
      {
        "day": "THU",
        "start": "15:00",
        "end": "16:20",
        "room": "SEU333",
        "startMinutes": 900,
        "endMinutes": 980
      },
      {
        "day": "SAT",
        "start": "15:00",
        "end": "16:20",
        "room": "SEU333",
        "startMinutes": 900,
        "endMinutes": 980
      }
    ]
  },
  {
    "courseCode": "CSE355",
    "sectionNumber": "12",
    "courseTitle": "Image Processing",
    "credits": 3.0,
    "facultyInitial": "RKM",
    "facultyName": "Md. Rakibul Islam",
    "scheduleText": "THU # 16:30 ~ 17:50 @ SEU332 / SAT # 16:30 ~ 17:50 @ SEU332",
    "slots": [
      {
        "day": "THU",
        "start": "16:30",
        "end": "17:50",
        "room": "SEU332",
        "startMinutes": 990,
        "endMinutes": 1070
      },
      {
        "day": "SAT",
        "start": "16:30",
        "end": "17:50",
        "room": "SEU332",
        "startMinutes": 990,
        "endMinutes": 1070
      }
    ]
  },
  {
    "courseCode": "CSE355",
    "sectionNumber": "13",
    "courseTitle": "Image Processing",
    "credits": 3.0,
    "facultyInitial": "RKM",
    "facultyName": "Md. Rakibul Islam",
    "scheduleText": "THU # 13:30 ~ 14:50 @ SEU325 / SAT # 13:30 ~ 14:50 @ SEU325",
    "slots": [
      {
        "day": "THU",
        "start": "13:30",
        "end": "14:50",
        "room": "SEU325",
        "startMinutes": 810,
        "endMinutes": 890
      },
      {
        "day": "SAT",
        "start": "13:30",
        "end": "14:50",
        "room": "SEU325",
        "startMinutes": 810,
        "endMinutes": 890
      }
    ]
  },
  {
    "courseCode": "CSE381",
    "sectionNumber": "1",
    "courseTitle": "Introduction to Embedded Systems",
    "credits": 3.0,
    "facultyInitial": "DSS",
    "facultyName": "Dr. Sherejad Sanam",
    "scheduleText": "SUN # 08:30 ~ 09:50 @ SEU535 / TUE # 08:30 ~ 09:50 @ SEU535",
    "slots": [
      {
        "day": "SUN",
        "start": "08:30",
        "end": "09:50",
        "room": "SEU535",
        "startMinutes": 510,
        "endMinutes": 590
      },
      {
        "day": "TUE",
        "start": "08:30",
        "end": "09:50",
        "room": "SEU535",
        "startMinutes": 510,
        "endMinutes": 590
      }
    ]
  },
  {
    "courseCode": "CSE381",
    "sectionNumber": "2",
    "courseTitle": "Introduction to Embedded Systems",
    "credits": 3.0,
    "facultyInitial": "DSS",
    "facultyName": "Dr. Sherejad Sanam",
    "scheduleText": "MON # 10:00 ~ 11:20 @ SEU401 / WED # 10:00 ~ 11:20 @ SEU401",
    "slots": [
      {
        "day": "MON",
        "start": "10:00",
        "end": "11:20",
        "room": "SEU401",
        "startMinutes": 600,
        "endMinutes": 680
      },
      {
        "day": "WED",
        "start": "10:00",
        "end": "11:20",
        "room": "SEU401",
        "startMinutes": 600,
        "endMinutes": 680
      }
    ]
  },
  {
    "courseCode": "CSE381",
    "sectionNumber": "3",
    "courseTitle": "Introduction to Embedded Systems",
    "credits": 3.0,
    "facultyInitial": "JABA",
    "facultyName": "Jayed Bin Azad",
    "scheduleText": "MON # 13:30 ~ 14:50 @ SEU608 / WED # 13:30 ~ 14:50 @ SEU608",
    "slots": [
      {
        "day": "MON",
        "start": "13:30",
        "end": "14:50",
        "room": "SEU608",
        "startMinutes": 810,
        "endMinutes": 890
      },
      {
        "day": "WED",
        "start": "13:30",
        "end": "14:50",
        "room": "SEU608",
        "startMinutes": 810,
        "endMinutes": 890
      }
    ]
  },
  {
    "courseCode": "CSE381",
    "sectionNumber": "4",
    "courseTitle": "Introduction to Embedded Systems",
    "credits": 3.0,
    "facultyInitial": "JABA",
    "facultyName": "Jayed Bin Azad",
    "scheduleText": "SUN # 11:30 ~ 12:50 @ SEU419 / TUE # 11:30 ~ 12:50 @ SEU419",
    "slots": [
      {
        "day": "SUN",
        "start": "11:30",
        "end": "12:50",
        "room": "SEU419",
        "startMinutes": 690,
        "endMinutes": 770
      },
      {
        "day": "TUE",
        "start": "11:30",
        "end": "12:50",
        "room": "SEU419",
        "startMinutes": 690,
        "endMinutes": 770
      }
    ]
  },
  {
    "courseCode": "CSE381",
    "sectionNumber": "5",
    "courseTitle": "Introduction to Embedded Systems",
    "credits": 3.0,
    "facultyInitial": "JABA",
    "facultyName": "Jayed Bin Azad",
    "scheduleText": "MON # 08:30 ~ 09:50 @ SEU333 / WED # 08:30 ~ 09:50 @ SEU333",
    "slots": [
      {
        "day": "MON",
        "start": "08:30",
        "end": "09:50",
        "room": "SEU333",
        "startMinutes": 510,
        "endMinutes": 590
      },
      {
        "day": "WED",
        "start": "08:30",
        "end": "09:50",
        "room": "SEU333",
        "startMinutes": 510,
        "endMinutes": 590
      }
    ]
  },
  {
    "courseCode": "CSE381",
    "sectionNumber": "8",
    "courseTitle": "Introduction to Embedded Systems",
    "credits": 3.0,
    "facultyInitial": "NAAO",
    "facultyName": "Md. Nahid Anam Opu",
    "scheduleText": "MON # 16:30 ~ 17:50 @ SEU535 / WED # 16:30 ~ 17:50 @ SEU535",
    "slots": [
      {
        "day": "MON",
        "start": "16:30",
        "end": "17:50",
        "room": "SEU535",
        "startMinutes": 990,
        "endMinutes": 1070
      },
      {
        "day": "WED",
        "start": "16:30",
        "end": "17:50",
        "room": "SEU535",
        "startMinutes": 990,
        "endMinutes": 1070
      }
    ]
  },
  {
    "courseCode": "CSE381",
    "sectionNumber": "9",
    "courseTitle": "Introduction to Embedded Systems",
    "credits": 3.0,
    "facultyInitial": "NAAO",
    "facultyName": "Md. Nahid Anam Opu",
    "scheduleText": "MON # 15:00 ~ 16:20 @ SEU509 / WED # 15:00 ~ 16:20 @ SEU509",
    "slots": [
      {
        "day": "MON",
        "start": "15:00",
        "end": "16:20",
        "room": "SEU509",
        "startMinutes": 900,
        "endMinutes": 980
      },
      {
        "day": "WED",
        "start": "15:00",
        "end": "16:20",
        "room": "SEU509",
        "startMinutes": 900,
        "endMinutes": 980
      }
    ]
  },
  {
    "courseCode": "CSE381",
    "sectionNumber": "10",
    "courseTitle": "Introduction to Embedded Systems",
    "credits": 3.0,
    "facultyInitial": "NAAO",
    "facultyName": "Md. Nahid Anam Opu",
    "scheduleText": "MON # 11:30 ~ 12:50 @ SEU330 / WED # 11:30 ~ 12:50 @ SEU330",
    "slots": [
      {
        "day": "MON",
        "start": "11:30",
        "end": "12:50",
        "room": "SEU330",
        "startMinutes": 690,
        "endMinutes": 770
      },
      {
        "day": "WED",
        "start": "11:30",
        "end": "12:50",
        "room": "SEU330",
        "startMinutes": 690,
        "endMinutes": 770
      }
    ]
  },
  {
    "courseCode": "CSE382",
    "sectionNumber": "1",
    "courseTitle": "Introduction to Embedded Systems Lab",
    "credits": 1.0,
    "facultyInitial": "JABA",
    "facultyName": "Jayed Bin Azad",
    "scheduleText": "TUE # 08:00 ~ 10:00 @ SEU610",
    "slots": [
      {
        "day": "TUE",
        "start": "08:00",
        "end": "10:00",
        "room": "SEU610",
        "startMinutes": 480,
        "endMinutes": 600
      }
    ]
  },
  {
    "courseCode": "CSE382",
    "sectionNumber": "2",
    "courseTitle": "Introduction to Embedded Systems Lab",
    "credits": 1.0,
    "facultyInitial": "JABA",
    "facultyName": "Jayed Bin Azad",
    "scheduleText": "SUN # 13:30 ~ 15:30 @ SEU610",
    "slots": [
      {
        "day": "SUN",
        "start": "13:30",
        "end": "15:30",
        "room": "SEU610",
        "startMinutes": 810,
        "endMinutes": 930
      }
    ]
  },
  {
    "courseCode": "CSE382",
    "sectionNumber": "3",
    "courseTitle": "Introduction to Embedded Systems Lab",
    "credits": 1.0,
    "facultyInitial": "JABA",
    "facultyName": "Jayed Bin Azad",
    "scheduleText": "SUN # 08:00 ~ 10:00 @ SEU610",
    "slots": [
      {
        "day": "SUN",
        "start": "08:00",
        "end": "10:00",
        "room": "SEU610",
        "startMinutes": 480,
        "endMinutes": 600
      }
    ]
  },
  {
    "courseCode": "CSE382",
    "sectionNumber": "7",
    "courseTitle": "Introduction to Embedded Systems Lab",
    "credits": 1.0,
    "facultyInitial": "NAAO",
    "facultyName": "Md. Nahid Anam Opu",
    "scheduleText": "SUN # 11:30 ~ 13:30 @ SEU610",
    "slots": [
      {
        "day": "SUN",
        "start": "11:30",
        "end": "13:30",
        "room": "SEU610",
        "startMinutes": 690,
        "endMinutes": 810
      }
    ]
  },
  {
    "courseCode": "CSE382",
    "sectionNumber": "8",
    "courseTitle": "Introduction to Embedded Systems Lab",
    "credits": 1.0,
    "facultyInitial": "NAAO",
    "facultyName": "Md. Nahid Anam Opu",
    "scheduleText": "TUE # 16:30 ~ 18:30 @ SEU610",
    "slots": [
      {
        "day": "TUE",
        "start": "16:30",
        "end": "18:30",
        "room": "SEU610",
        "startMinutes": 990,
        "endMinutes": 1110
      }
    ]
  },
  {
    "courseCode": "CSE382",
    "sectionNumber": "9",
    "courseTitle": "Introduction to Embedded Systems Lab",
    "credits": 1.0,
    "facultyInitial": "NAAO",
    "facultyName": "Md. Nahid Anam Opu",
    "scheduleText": "TUE # 11:30 ~ 13:30 @ SEU610",
    "slots": [
      {
        "day": "TUE",
        "start": "11:30",
        "end": "13:30",
        "room": "SEU610",
        "startMinutes": 690,
        "endMinutes": 810
      }
    ]
  },
  {
    "courseCode": "CSE382",
    "sectionNumber": "10",
    "courseTitle": "Introduction to Embedded Systems Lab",
    "credits": 1.0,
    "facultyInitial": "TMD",
    "facultyName": "Tashreef Muhammad",
    "scheduleText": "WED # 11:30 ~ 13:30 @ SEU610",
    "slots": [
      {
        "day": "WED",
        "start": "11:30",
        "end": "13:30",
        "room": "SEU610",
        "startMinutes": 690,
        "endMinutes": 810
      }
    ]
  },
  {
    "courseCode": "CSE382",
    "sectionNumber": "11",
    "courseTitle": "Introduction to Embedded Systems Lab",
    "credits": 1.0,
    "facultyInitial": "TMD",
    "facultyName": "Tashreef Muhammad",
    "scheduleText": "THU # 13:30 ~ 15:30 @ SEU610",
    "slots": [
      {
        "day": "THU",
        "start": "13:30",
        "end": "15:30",
        "room": "SEU610",
        "startMinutes": 810,
        "endMinutes": 930
      }
    ]
  },
  {
    "courseCode": "CSE382",
    "sectionNumber": "12",
    "courseTitle": "Introduction to Embedded Systems Lab",
    "credits": 1.0,
    "facultyInitial": "TMD",
    "facultyName": "Tashreef Muhammad",
    "scheduleText": "SUN # 16:30 ~ 18:30 @ SEU610",
    "slots": [
      {
        "day": "SUN",
        "start": "16:30",
        "end": "18:30",
        "room": "SEU610",
        "startMinutes": 990,
        "endMinutes": 1110
      }
    ]
  },
  {
    "courseCode": "CSE382",
    "sectionNumber": "13",
    "courseTitle": "Introduction to Embedded Systems Lab",
    "credits": 1.0,
    "facultyInitial": "TMD",
    "facultyName": "Tashreef Muhammad",
    "scheduleText": "WED # 16:30 ~ 18:30 @ SEU610",
    "slots": [
      {
        "day": "WED",
        "start": "16:30",
        "end": "18:30",
        "room": "SEU610",
        "startMinutes": 990,
        "endMinutes": 1110
      }
    ]
  },
  {
    "courseCode": "CSE382",
    "sectionNumber": "14",
    "courseTitle": "Introduction to Embedded Systems Lab",
    "credits": 1.0,
    "facultyInitial": "TMD",
    "facultyName": "Tashreef Muhammad",
    "scheduleText": "WED # 13:30 ~ 15:30 @ SEU610",
    "slots": [
      {
        "day": "WED",
        "start": "13:30",
        "end": "15:30",
        "room": "SEU610",
        "startMinutes": 810,
        "endMinutes": 930
      }
    ]
  },
  {
    "courseCode": "CSE382",
    "sectionNumber": "15",
    "courseTitle": "Introduction to Embedded Systems Lab",
    "credits": 1.0,
    "facultyInitial": "TMD",
    "facultyName": "Tashreef Muhammad",
    "scheduleText": "TUE # 13:30 ~ 15:30 @ SEU610",
    "slots": [
      {
        "day": "TUE",
        "start": "13:30",
        "end": "15:30",
        "room": "SEU610",
        "startMinutes": 810,
        "endMinutes": 930
      }
    ]
  },
  {
    "courseCode": "CSE382",
    "sectionNumber": "16",
    "courseTitle": "Introduction to Embedded Systems Lab",
    "credits": 1.0,
    "facultyInitial": "TMD",
    "facultyName": "Tashreef Muhammad",
    "scheduleText": "THU # 16:30 ~ 18:30 @ SEU610",
    "slots": [
      {
        "day": "THU",
        "start": "16:30",
        "end": "18:30",
        "room": "SEU610",
        "startMinutes": 990,
        "endMinutes": 1110
      }
    ]
  },
  {
    "courseCode": "CSE443",
    "sectionNumber": "2",
    "courseTitle": "Computer Graphics & Animation",
    "credits": 3.0,
    "facultyInitial": "GMRN",
    "facultyName": "Gazi Maliha Raisa Noor",
    "scheduleText": "SUN # 08:30 ~ 09:50 @ SEU536 / TUE # 08:30 ~ 09:50 @ SEU536",
    "slots": [
      {
        "day": "SUN",
        "start": "08:30",
        "end": "09:50",
        "room": "SEU536",
        "startMinutes": 510,
        "endMinutes": 590
      },
      {
        "day": "TUE",
        "start": "08:30",
        "end": "09:50",
        "room": "SEU536",
        "startMinutes": 510,
        "endMinutes": 590
      }
    ]
  },
  {
    "courseCode": "CSE443",
    "sectionNumber": "3",
    "courseTitle": "Computer Graphics & Animation",
    "credits": 3.0,
    "facultyInitial": "NIBI",
    "facultyName": "Sheikh Md. Nibir",
    "scheduleText": "THU # 10:00 ~ 11:20 @ SEU612 / SAT # 10:00 ~ 11:20 @ SEU612",
    "slots": [
      {
        "day": "THU",
        "start": "10:00",
        "end": "11:20",
        "room": "SEU612",
        "startMinutes": 600,
        "endMinutes": 680
      },
      {
        "day": "SAT",
        "start": "10:00",
        "end": "11:20",
        "room": "SEU612",
        "startMinutes": 600,
        "endMinutes": 680
      }
    ]
  },
  {
    "courseCode": "CSE443",
    "sectionNumber": "4",
    "courseTitle": "Computer Graphics & Animation",
    "credits": 3.0,
    "facultyInitial": "NIBI",
    "facultyName": "Sheikh Md. Nibir",
    "scheduleText": "THU # 11:30 ~ 12:50 @ SEU327 / SAT # 11:30 ~ 12:50 @ SEU327",
    "slots": [
      {
        "day": "THU",
        "start": "11:30",
        "end": "12:50",
        "room": "SEU327",
        "startMinutes": 690,
        "endMinutes": 770
      },
      {
        "day": "SAT",
        "start": "11:30",
        "end": "12:50",
        "room": "SEU327",
        "startMinutes": 690,
        "endMinutes": 770
      }
    ]
  },
  {
    "courseCode": "CSE443",
    "sectionNumber": "6",
    "courseTitle": "Computer Graphics & Animation",
    "credits": 3.0,
    "facultyInitial": "REZA",
    "facultyName": "Resam Zaha",
    "scheduleText": "SUN # 15:00 ~ 16:20 @ SEU611 / TUE # 15:00 ~ 16:20 @ SEU611",
    "slots": [
      {
        "day": "SUN",
        "start": "15:00",
        "end": "16:20",
        "room": "SEU611",
        "startMinutes": 900,
        "endMinutes": 980
      },
      {
        "day": "TUE",
        "start": "15:00",
        "end": "16:20",
        "room": "SEU611",
        "startMinutes": 900,
        "endMinutes": 980
      }
    ]
  },
  {
    "courseCode": "CSE443",
    "sectionNumber": "7",
    "courseTitle": "Computer Graphics & Animation",
    "credits": 3.0,
    "facultyInitial": "RZC",
    "facultyName": "Md. Reasad Zaman Chowdhury",
    "scheduleText": "THU # 13:30 ~ 14:50 @ SEU332 / SAT # 13:30 ~ 14:50 @ SEU332",
    "slots": [
      {
        "day": "THU",
        "start": "13:30",
        "end": "14:50",
        "room": "SEU332",
        "startMinutes": 810,
        "endMinutes": 890
      },
      {
        "day": "SAT",
        "start": "13:30",
        "end": "14:50",
        "room": "SEU332",
        "startMinutes": 810,
        "endMinutes": 890
      }
    ]
  },
  {
    "courseCode": "CSE443",
    "sectionNumber": "8",
    "courseTitle": "Computer Graphics & Animation",
    "credits": 3.0,
    "facultyInitial": "RZC",
    "facultyName": "Md. Reasad Zaman Chowdhury",
    "scheduleText": "THU # 15:00 ~ 16:20 @ SEU320 / SAT # 15:00 ~ 16:20 @ SEU320",
    "slots": [
      {
        "day": "THU",
        "start": "15:00",
        "end": "16:20",
        "room": "SEU320",
        "startMinutes": 900,
        "endMinutes": 980
      },
      {
        "day": "SAT",
        "start": "15:00",
        "end": "16:20",
        "room": "SEU320",
        "startMinutes": 900,
        "endMinutes": 980
      }
    ]
  },
  {
    "courseCode": "CSE443",
    "sectionNumber": "9",
    "courseTitle": "Computer Graphics & Animation",
    "credits": 3.0,
    "facultyInitial": "SHJA",
    "facultyName": "Shanjida Alam",
    "scheduleText": "SUN # 10:00 ~ 11:20 @ SEU419 / TUE # 10:00 ~ 11:20 @ SEU419",
    "slots": [
      {
        "day": "SUN",
        "start": "10:00",
        "end": "11:20",
        "room": "SEU419",
        "startMinutes": 600,
        "endMinutes": 680
      },
      {
        "day": "TUE",
        "start": "10:00",
        "end": "11:20",
        "room": "SEU419",
        "startMinutes": 600,
        "endMinutes": 680
      }
    ]
  },
  {
    "courseCode": "CSE443",
    "sectionNumber": "10",
    "courseTitle": "Computer Graphics & Animation",
    "credits": 3.0,
    "facultyInitial": "SHJA",
    "facultyName": "Shanjida Alam",
    "scheduleText": "SUN # 08:30 ~ 09:50 @ SEU330 / TUE # 08:30 ~ 09:50 @ SEU330",
    "slots": [
      {
        "day": "SUN",
        "start": "08:30",
        "end": "09:50",
        "room": "SEU330",
        "startMinutes": 510,
        "endMinutes": 590
      },
      {
        "day": "TUE",
        "start": "08:30",
        "end": "09:50",
        "room": "SEU330",
        "startMinutes": 510,
        "endMinutes": 590
      }
    ]
  },
  {
    "courseCode": "CSE443",
    "sectionNumber": "11",
    "courseTitle": "Computer Graphics & Animation",
    "credits": 3.0,
    "facultyInitial": "TAJO",
    "facultyName": "Tanjina Oriana",
    "scheduleText": "MON # 10:00 ~ 11:20 @ SEU333 / WED # 10:00 ~ 11:20 @ SEU333",
    "slots": [
      {
        "day": "MON",
        "start": "10:00",
        "end": "11:20",
        "room": "SEU333",
        "startMinutes": 600,
        "endMinutes": 680
      },
      {
        "day": "WED",
        "start": "10:00",
        "end": "11:20",
        "room": "SEU333",
        "startMinutes": 600,
        "endMinutes": 680
      }
    ]
  },
  {
    "courseCode": "CSE443",
    "sectionNumber": "12",
    "courseTitle": "Computer Graphics & Animation",
    "credits": 3.0,
    "facultyInitial": "TAJO",
    "facultyName": "Tanjina Oriana",
    "scheduleText": "SUN # 13:30 ~ 14:50 @ SEU331 / TUE # 13:30 ~ 14:50 @ SEU331",
    "slots": [
      {
        "day": "SUN",
        "start": "13:30",
        "end": "14:50",
        "room": "SEU331",
        "startMinutes": 810,
        "endMinutes": 890
      },
      {
        "day": "TUE",
        "start": "13:30",
        "end": "14:50",
        "room": "SEU331",
        "startMinutes": 810,
        "endMinutes": 890
      }
    ]
  },
  {
    "courseCode": "CSE444",
    "sectionNumber": "4",
    "courseTitle": "Computer Graphics & Animation Lab",
    "credits": 1.0,
    "facultyInitial": "GMRN",
    "facultyName": "Gazi Maliha Raisa Noor",
    "scheduleText": "WED # 13:30 ~ 15:30 @ SEU611",
    "slots": [
      {
        "day": "WED",
        "start": "13:30",
        "end": "15:30",
        "room": "SEU611",
        "startMinutes": 810,
        "endMinutes": 930
      }
    ]
  },
  {
    "courseCode": "CSE444",
    "sectionNumber": "5",
    "courseTitle": "Computer Graphics & Animation Lab",
    "credits": 1.0,
    "facultyInitial": "GMRN",
    "facultyName": "Gazi Maliha Raisa Noor",
    "scheduleText": "WED # 11:30 ~ 13:30 @ SEU608",
    "slots": [
      {
        "day": "WED",
        "start": "11:30",
        "end": "13:30",
        "room": "SEU608",
        "startMinutes": 690,
        "endMinutes": 810
      }
    ]
  },
  {
    "courseCode": "CSE444",
    "sectionNumber": "6",
    "courseTitle": "Computer Graphics & Animation Lab",
    "credits": 1.0,
    "facultyInitial": "GMRN",
    "facultyName": "Gazi Maliha Raisa Noor",
    "scheduleText": "TUE # 11:30 ~ 13:30 @ SEU213A",
    "slots": [
      {
        "day": "TUE",
        "start": "11:30",
        "end": "13:30",
        "room": "SEU213A",
        "startMinutes": 690,
        "endMinutes": 810
      }
    ]
  },
  {
    "courseCode": "CSE444",
    "sectionNumber": "7",
    "courseTitle": "Computer Graphics & Animation Lab",
    "credits": 1.0,
    "facultyInitial": "NIBI",
    "facultyName": "Sheikh Md. Nibir",
    "scheduleText": "THU # 13:30 ~ 15:30 @ SEU609",
    "slots": [
      {
        "day": "THU",
        "start": "13:30",
        "end": "15:30",
        "room": "SEU609",
        "startMinutes": 810,
        "endMinutes": 930
      }
    ]
  },
  {
    "courseCode": "CSE444",
    "sectionNumber": "8",
    "courseTitle": "Computer Graphics & Animation Lab",
    "credits": 1.0,
    "facultyInitial": "NIBI",
    "facultyName": "Sheikh Md. Nibir",
    "scheduleText": "SAT # 08:00 ~ 10:00 @ SEU608 / SAT # 08:00 ~ 10:00 @ SEU608",
    "slots": [
      {
        "day": "SAT",
        "start": "08:00",
        "end": "10:00",
        "room": "SEU608",
        "startMinutes": 480,
        "endMinutes": 600
      },
      {
        "day": "SAT",
        "start": "08:00",
        "end": "10:00",
        "room": "SEU608",
        "startMinutes": 480,
        "endMinutes": 600
      }
    ]
  },
  {
    "courseCode": "CSE444",
    "sectionNumber": "9",
    "courseTitle": "Computer Graphics & Animation Lab",
    "credits": 1.0,
    "facultyInitial": "NIBI",
    "facultyName": "Sheikh Md. Nibir",
    "scheduleText": "THU # 08:00 ~ 10:00 @ SEU213B",
    "slots": [
      {
        "day": "THU",
        "start": "08:00",
        "end": "10:00",
        "room": "SEU213B",
        "startMinutes": 480,
        "endMinutes": 600
      }
    ]
  },
  {
    "courseCode": "CSE444",
    "sectionNumber": "10",
    "courseTitle": "Computer Graphics & Animation Lab",
    "credits": 1.0,
    "facultyInitial": "RZC",
    "facultyName": "Md. Reasad Zaman Chowdhury",
    "scheduleText": "THU # 16:30 ~ 18:30 @ SEU614",
    "slots": [
      {
        "day": "THU",
        "start": "16:30",
        "end": "18:30",
        "room": "SEU614",
        "startMinutes": 990,
        "endMinutes": 1110
      }
    ]
  },
  {
    "courseCode": "CSE444",
    "sectionNumber": "11",
    "courseTitle": "Computer Graphics & Animation Lab",
    "credits": 1.0,
    "facultyInitial": "RZC",
    "facultyName": "Md. Reasad Zaman Chowdhury",
    "scheduleText": "SAT # 16:30 ~ 18:30 @ SEU609 / SAT # 16:30 ~ 18:30 @ SEU609",
    "slots": [
      {
        "day": "SAT",
        "start": "16:30",
        "end": "18:30",
        "room": "SEU609",
        "startMinutes": 990,
        "endMinutes": 1110
      },
      {
        "day": "SAT",
        "start": "16:30",
        "end": "18:30",
        "room": "SEU609",
        "startMinutes": 990,
        "endMinutes": 1110
      }
    ]
  },
  {
    "courseCode": "CSE444",
    "sectionNumber": "12",
    "courseTitle": "Computer Graphics & Animation Lab",
    "credits": 1.0,
    "facultyInitial": "RZC",
    "facultyName": "Md. Reasad Zaman Chowdhury",
    "scheduleText": "SAT # 11:30 ~ 13:30 @ SEU213A / SAT # 11:30 ~ 13:30 @ SEU213A",
    "slots": [
      {
        "day": "SAT",
        "start": "11:30",
        "end": "13:30",
        "room": "SEU213A",
        "startMinutes": 690,
        "endMinutes": 810
      },
      {
        "day": "SAT",
        "start": "11:30",
        "end": "13:30",
        "room": "SEU213A",
        "startMinutes": 690,
        "endMinutes": 810
      }
    ]
  },
  {
    "courseCode": "CSE444",
    "sectionNumber": "13",
    "courseTitle": "Computer Graphics & Animation Lab",
    "credits": 1.0,
    "facultyInitial": "TAJO",
    "facultyName": "Tanjina Oriana",
    "scheduleText": "WED # 11:30 ~ 13:30 @ SEU614",
    "slots": [
      {
        "day": "WED",
        "start": "11:30",
        "end": "13:30",
        "room": "SEU614",
        "startMinutes": 690,
        "endMinutes": 810
      }
    ]
  },
  {
    "courseCode": "CSE444",
    "sectionNumber": "14",
    "courseTitle": "Computer Graphics & Animation Lab",
    "credits": 1.0,
    "facultyInitial": "TAJO",
    "facultyName": "Tanjina Oriana",
    "scheduleText": "WED # 08:00 ~ 10:00 @ SEU614",
    "slots": [
      {
        "day": "WED",
        "start": "08:00",
        "end": "10:00",
        "room": "SEU614",
        "startMinutes": 480,
        "endMinutes": 600
      }
    ]
  },
  {
    "courseCode": "CSE444",
    "sectionNumber": "15",
    "courseTitle": "Computer Graphics & Animation Lab",
    "credits": 1.0,
    "facultyInitial": "TAJO",
    "facultyName": "Tanjina Oriana",
    "scheduleText": "MON # 13:30 ~ 15:30 @ SEU611",
    "slots": [
      {
        "day": "MON",
        "start": "13:30",
        "end": "15:30",
        "room": "SEU611",
        "startMinutes": 810,
        "endMinutes": 930
      }
    ]
  },
  {
    "courseCode": "CSE472",
    "sectionNumber": "1",
    "courseTitle": "Web and Internet Programming Lab",
    "credits": 1.0,
    "facultyInitial": "ABAH",
    "facultyName": "Abid Ahmad",
    "scheduleText": "MON # 16:30 ~ 18:30 @ SEU614",
    "slots": [
      {
        "day": "MON",
        "start": "16:30",
        "end": "18:30",
        "room": "SEU614",
        "startMinutes": 990,
        "endMinutes": 1110
      }
    ]
  },
  {
    "courseCode": "CSE472",
    "sectionNumber": "2",
    "courseTitle": "Web and Internet Programming Lab",
    "credits": 1.0,
    "facultyInitial": "ABAH",
    "facultyName": "Abid Ahmad",
    "scheduleText": "WED # 16:30 ~ 18:30 @ SEU614",
    "slots": [
      {
        "day": "WED",
        "start": "16:30",
        "end": "18:30",
        "room": "SEU614",
        "startMinutes": 990,
        "endMinutes": 1110
      }
    ]
  },
  {
    "courseCode": "CSE472",
    "sectionNumber": "3",
    "courseTitle": "Web and Internet Programming Lab",
    "credits": 1.0,
    "facultyInitial": "ABAH",
    "facultyName": "Abid Ahmad",
    "scheduleText": "MON # 11:30 ~ 13:30 @ SEU608",
    "slots": [
      {
        "day": "MON",
        "start": "11:30",
        "end": "13:30",
        "room": "SEU608",
        "startMinutes": 690,
        "endMinutes": 810
      }
    ]
  },
  {
    "courseCode": "CSE472",
    "sectionNumber": "4",
    "courseTitle": "Web and Internet Programming Lab",
    "credits": 1.0,
    "facultyInitial": "ANMS",
    "facultyName": "Anik Mahmud Shanto",
    "scheduleText": "THU # 11:30 ~ 13:30 @ SEU804",
    "slots": [
      {
        "day": "THU",
        "start": "11:30",
        "end": "13:30",
        "room": "SEU804",
        "startMinutes": 690,
        "endMinutes": 810
      }
    ]
  },
  {
    "courseCode": "CSE472",
    "sectionNumber": "5",
    "courseTitle": "Web and Internet Programming Lab",
    "credits": 1.0,
    "facultyInitial": "ANMS",
    "facultyName": "Anik Mahmud Shanto",
    "scheduleText": "SUN # 13:30 ~ 15:30 @ SEU615",
    "slots": [
      {
        "day": "SUN",
        "start": "13:30",
        "end": "15:30",
        "room": "SEU615",
        "startMinutes": 810,
        "endMinutes": 930
      }
    ]
  },
  {
    "courseCode": "CSE472",
    "sectionNumber": "6",
    "courseTitle": "Web and Internet Programming Lab",
    "credits": 1.0,
    "facultyInitial": "ANMS",
    "facultyName": "Anik Mahmud Shanto",
    "scheduleText": "SUN # 08:00 ~ 10:00 @ SEU615",
    "slots": [
      {
        "day": "SUN",
        "start": "08:00",
        "end": "10:00",
        "room": "SEU615",
        "startMinutes": 480,
        "endMinutes": 600
      }
    ]
  },
  {
    "courseCode": "CSE472",
    "sectionNumber": "7",
    "courseTitle": "Web and Internet Programming Lab",
    "credits": 1.0,
    "facultyInitial": "ANMS",
    "facultyName": "Anik Mahmud Shanto",
    "scheduleText": "SUN # 11:30 ~ 13:30 @ SEU213B",
    "slots": [
      {
        "day": "SUN",
        "start": "11:30",
        "end": "13:30",
        "room": "SEU213B",
        "startMinutes": 690,
        "endMinutes": 810
      }
    ]
  },
  {
    "courseCode": "CSE472",
    "sectionNumber": "8",
    "courseTitle": "Web and Internet Programming Lab",
    "credits": 1.0,
    "facultyInitial": "ANMS",
    "facultyName": "Anik Mahmud Shanto",
    "scheduleText": "THU # 13:30 ~ 15:30 @ SEU213B",
    "slots": [
      {
        "day": "THU",
        "start": "13:30",
        "end": "15:30",
        "room": "SEU213B",
        "startMinutes": 810,
        "endMinutes": 930
      }
    ]
  },
  {
    "courseCode": "CSE382",
    "sectionNumber": "15",
    "courseTitle": "Introduction to Embedded Systems Lab",
    "credits": 1.0,
    "facultyInitial": "JABA",
    "facultyName": "Jannatul Ferdous Azad",
    "scheduleText": "FRI # 09:00 ~ 11:00 @ SEU608",
    "slots": [
      {
        "day": "FRI",
        "start": "09:00",
        "end": "11:00",
        "room": "SEU608",
        "startMinutes": 540,
        "endMinutes": 660
      }
    ]
  },
  {
    "courseCode": "CSE382",
    "sectionNumber": "16",
    "courseTitle": "Introduction to Embedded Systems Lab",
    "credits": 1.0,
    "facultyInitial": "NAAO",
    "facultyName": "Md. Nahid Anam Opu",
    "scheduleText": "FRI # 14:30 ~ 16:30 @ SEU608",
    "slots": [
      {
        "day": "FRI",
        "start": "14:30",
        "end": "16:30",
        "room": "SEU608",
        "startMinutes": 870,
        "endMinutes": 990
      }
    ]
  },
  {
    "courseCode": "CSE444",
    "sectionNumber": "14",
    "courseTitle": "Computer Graphics & Animation Lab",
    "credits": 1.0,
    "facultyInitial": "GMNN",
    "facultyName": "Golam Md. Noor",
    "scheduleText": "FRI # 09:00 ~ 11:00 @ SEU615",
    "slots": [
      {
        "day": "FRI",
        "start": "09:00",
        "end": "11:00",
        "room": "SEU615",
        "startMinutes": 540,
        "endMinutes": 660
      }
    ]
  },
  {
    "courseCode": "CSE444",
    "sectionNumber": "15",
    "courseTitle": "Computer Graphics & Animation Lab",
    "credits": 1.0,
    "facultyInitial": "SHOA",
    "facultyName": "Md. Shahin Alam",
    "scheduleText": "FRI # 14:30 ~ 16:30 @ SEU615",
    "slots": [
      {
        "day": "FRI",
        "start": "14:30",
        "end": "16:30",
        "room": "SEU615",
        "startMinutes": 870,
        "endMinutes": 990
      }
    ]
  },
  {
    "courseCode": "CSE472",
    "sectionNumber": "9",
    "courseTitle": "Web and Internet Programming Lab",
    "credits": 1.0,
    "facultyInitial": "ABAH",
    "facultyName": "Abid Ahmad",
    "scheduleText": "FRI # 09:30 ~ 11:30 @ SEU213B",
    "slots": [
      {
        "day": "FRI",
        "start": "09:30",
        "end": "11:30",
        "room": "SEU213B",
        "startMinutes": 570,
        "endMinutes": 690
      }
    ]
  },
  {
    "courseCode": "CSE472",
    "sectionNumber": "10",
    "courseTitle": "Web and Internet Programming Lab",
    "credits": 1.0,
    "facultyInitial": "ANMS",
    "facultyName": "Anik Mahmud Shanto",
    "scheduleText": "FRI # 15:00 ~ 17:00 @ SEU213B",
    "slots": [
      {
        "day": "FRI",
        "start": "15:00",
        "end": "17:00",
        "room": "SEU213B",
        "startMinutes": 900,
        "endMinutes": 1020
      }
    ]
  }
];
