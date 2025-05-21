// Welcome to your schema
//   Schema driven development is Keystone's modus operandi
//
// This file is where we define the lists, fields and hooks for our data.
// If you want to learn more about how lists are configured, please read
// - https://keystonejs.com/docs/config/lists

import { list } from "@keystone-6/core";
import { allowAll } from "@keystone-6/core/access";

// see https://keystonejs.com/docs/fields/overview for the full list of fields
//   this is a few common fields for an example
import {
  text,
  relationship,
  password,
  timestamp,
  select,
  calendarDay,
  virtual,
  integer,
  float,
  checkbox,
  json,
  multiselect,
} from "@keystone-6/core/fields";

// the document field is a more complicated field, so it has it's own package
import { document } from "@keystone-6/fields-document";
// if you want to make your own fields, see https://keystonejs.com/docs/guides/custom-fields

// when using Typescript, you can refine your types to a stricter subset by importing
// the generated types from '.keystone/types'
import { type Lists } from ".keystone/types";
import type { KeystoneContext } from "@keystone-6/core/types";
import { graphql } from "@keystone-6/core";

function toDate(val: string | Date | null | undefined): Date | null {
  if (!val) return null;
  if (val instanceof Date) return val;
  return new Date(val);
}

// Global facility open/close times (24h format, e.g. '08:00', '22:00')
export const FACILITY_OPEN_TIME = "08:00";
export const FACILITY_CLOSE_TIME = "22:00";

export const lists = {
  User: list({
    access: allowAll,

    // this is the fields for our User list
    fields: {
      // by adding isRequired, we enforce that every User should have a name
      //   if no name is provided, an error will be displayed
      name: text({ validation: { isRequired: true } }),

      email: text({
        validation: { isRequired: true },
        // by adding isIndexed: 'unique', we're saying that no user can have the same
        // email as another user - this may or may not be a good idea for your project
        isIndexed: "unique",
      }),

      password: password({ validation: { isRequired: true } }),

      dateOfBirth: calendarDay({
        // Making it optional for existing records
      }),

      role: select({
        type: "string",
        options: [
          { label: "Admin", value: "ADMIN" },
          { label: "Coach", value: "COACH" },
          { label: "Customer", value: "CUSTOMER" },
        ],
        defaultValue: "CUSTOMER",
        validation: { isRequired: true },
      }),

      dependents: relationship({
        ref: "Dependent.customer",
        many: true,
        ui: {
          displayMode: "cards",
          cardFields: ["name", "dateOfBirth"],
          linkToItem: true,
          inlineCreate: { fields: ["name", "dateOfBirth"] },
          inlineEdit: { fields: ["name", "dateOfBirth"] },
        },
      }),

      // we can use this field to see what Posts this User has authored
      //   more on that in the Post list below
      posts: relationship({ ref: "Post.author", many: true }),

      enrollments: relationship({
        ref: "Enrollment.customer",
        many: true,
        ui: {
          displayMode: "cards",
          cardFields: [
            "program",
            "participant",
            "dependent",
            "status",
            "enrolledAt",
          ],
          linkToItem: true,
          inlineCreate: {
            fields: ["program", "participant", "dependent", "status"],
          },
          inlineEdit: { fields: ["status"] },
        },
      }),

      participantEnrollments: relationship({
        ref: "Enrollment.participant",
        many: true,
        ui: {
          displayMode: "cards",
          cardFields: ["program", "customer", "status", "enrolledAt"],
          linkToItem: true,
        },
      }),

      createdAt: timestamp({
        // this sets the timestamp to Date.now() when the user is first created
        defaultValue: { kind: "now" },
      }),

      updatedAt: timestamp({
        defaultValue: { kind: "now" },
      }),

      waiverAcceptances: relationship({
        ref: "WaiverAcceptance.customer",
        many: true,
      }),

      instructedPrograms: relationship({
        ref: "Program.instructors",
        many: true,
        ui: {
          displayMode: "cards",
          cardFields: ["name"],
          linkToItem: true,
          inlineConnect: true,
          inlineCreate: { fields: ["name"] },
          inlineEdit: { fields: ["name"] },
        },
        hooks: {
          validateInput: async ({ resolvedData, context, operation }) => {
            if (operation === "create" || operation === "update") {
              const instructorIds =
                resolvedData.instructors?.connect?.map((c: any) => c.id) || [];
              if (instructorIds.length > 0) {
                const instructors = await context.query.User.findMany({
                  where: { id: { in: instructorIds } },
                  query: "id role",
                });

                const nonCoaches = instructors.filter(
                  (instructor) => instructor.role !== "COACH"
                );
                if (nonCoaches.length > 0) {
                  throw new Error(
                    "Only users with the COACH role can be assigned as instructors"
                  );
                }
              }
            }
          },
        },
      }),

      tShirtFit: select({
        type: "string",
        options: [
          { label: "Male", value: "male" },
          { label: "Female", value: "female" },
        ],
        ui: { description: "T-shirt fit (male/female)" },
      }),
      tShirtSize: select({
        type: "string",
        options: [
          { label: "Youth XS", value: "youth_xs" },
          { label: "Youth S", value: "youth_s" },
          { label: "Youth M", value: "youth_m" },
          { label: "Youth L", value: "youth_l" },
          { label: "Youth XL", value: "youth_xl" },
          { label: "Adult XS", value: "adult_xs" },
          { label: "Adult S", value: "adult_s" },
          { label: "Adult M", value: "adult_m" },
          { label: "Adult L", value: "adult_l" },
          { label: "Adult XL", value: "adult_xl" },
          { label: "Adult XXL", value: "adult_xxl" },
        ],
        ui: { description: "Select youth or adult size as appropriate." },
      }),
      tShirtDescription: virtual({
        field: graphql.field({
          type: graphql.String,
          resolve(itemArg) {
            const item = itemArg as { tShirtFit?: string; tShirtSize?: string };
            const fitMap = { male: "Male", female: "Female" };
            const sizeMap = {
              youth_xs: "Youth XS",
              youth_s: "Youth S",
              youth_m: "Youth M",
              youth_l: "Youth L",
              youth_xl: "Youth XL",
              adult_xs: "Adult XS",
              adult_s: "Adult S",
              adult_m: "Adult M",
              adult_l: "Adult L",
              adult_xl: "Adult XL",
              adult_xxl: "Adult XXL",
            };
            type FitKey = keyof typeof fitMap;
            type SizeKey = keyof typeof sizeMap;
            const fit = item.tShirtFit ? fitMap[item.tShirtFit as FitKey] : "";
            const size = item.tShirtSize
              ? sizeMap[item.tShirtSize as SizeKey]
              : "";
            return fit && size ? `${fit} ${size}` : "";
          },
        }),
        ui: {
          createView: { fieldMode: "hidden" },
          itemView: { fieldMode: "read" },
          listView: { fieldMode: "read" },
        },
      }),
    },
  }),

  Dependent: list({
    access: allowAll,
    fields: {
      name: text({ validation: { isRequired: true } }),
      dateOfBirth: calendarDay({
        // Making it optional for existing records
      }),
      customer: relationship({
        ref: "User.dependents",
        many: false,
      }),
      participantEnrollments: relationship({
        ref: "Enrollment.dependent",
        many: true,
        ui: {
          displayMode: "cards",
          cardFields: ["program", "customer", "status", "enrolledAt"],
          linkToItem: true,
          inlineCreate: { fields: ["program", "customer", "status"] },
          inlineEdit: { fields: ["status"] },
        },
      }),
      createdAt: timestamp({
        defaultValue: { kind: "now" },
      }),
      updatedAt: timestamp({
        defaultValue: { kind: "now" },
      }),
      waiverAcceptances: relationship({
        ref: "WaiverAcceptance.dependent",
        many: true,
      }),

      tShirtFit: select({
        type: "string",
        options: [
          { label: "Male", value: "male" },
          { label: "Female", value: "female" },
        ],
        ui: { description: "T-shirt fit (male/female)" },
      }),
      tShirtSize: select({
        type: "string",
        options: [
          { label: "Youth XS", value: "youth_xs" },
          { label: "Youth S", value: "youth_s" },
          { label: "Youth M", value: "youth_m" },
          { label: "Youth L", value: "youth_l" },
          { label: "Youth XL", value: "youth_xl" },
          { label: "Adult XS", value: "adult_xs" },
          { label: "Adult S", value: "adult_s" },
          { label: "Adult M", value: "adult_m" },
          { label: "Adult L", value: "adult_l" },
          { label: "Adult XL", value: "adult_xl" },
          { label: "Adult XXL", value: "adult_xxl" },
        ],
        ui: { description: "Select youth or adult size as appropriate." },
      }),
      tShirtDescription: virtual({
        field: graphql.field({
          type: graphql.String,
          resolve(itemArg) {
            const item = itemArg as { tShirtFit?: string; tShirtSize?: string };
            const fitMap = { male: "Male", female: "Female" };
            const sizeMap = {
              youth_xs: "Youth XS",
              youth_s: "Youth S",
              youth_m: "Youth M",
              youth_l: "Youth L",
              youth_xl: "Youth XL",
              adult_xs: "Adult XS",
              adult_s: "Adult S",
              adult_m: "Adult M",
              adult_l: "Adult L",
              adult_xl: "Adult XL",
              adult_xxl: "Adult XXL",
            };
            type FitKey = keyof typeof fitMap;
            type SizeKey = keyof typeof sizeMap;
            const fit = item.tShirtFit ? fitMap[item.tShirtFit as FitKey] : "";
            const size = item.tShirtSize
              ? sizeMap[item.tShirtSize as SizeKey]
              : "";
            return fit && size ? `${fit} ${size}` : "";
          },
        }),
        ui: {
          createView: { fieldMode: "hidden" },
          itemView: { fieldMode: "read" },
          listView: { fieldMode: "read" },
        },
      }),
    },
  }),

  Post: list({
    access: allowAll,

    // this is the fields for our Post list
    fields: {
      title: text({ validation: { isRequired: true } }),

      // the document field can be used for making rich editable content
      //   you can find out more at https://keystonejs.com/docs/guides/document-fields
      content: document({
        formatting: true,
        layouts: [
          [1, 1],
          [1, 1, 1],
          [2, 1],
          [1, 2],
          [1, 2, 1],
        ],
        links: true,
        dividers: true,
      }),

      // with this field, you can set a User as the author for a Post
      author: relationship({
        // we could have used 'User', but then the relationship would only be 1-way
        ref: "User.posts",

        // this is some customisations for changing how this will look in the AdminUI
        ui: {
          displayMode: "cards",
          cardFields: ["name", "email"],
          inlineEdit: { fields: ["name", "email"] },
          linkToItem: true,
          inlineConnect: true,
        },

        // a Post can only have one author
        //   this is the default, but we show it here for verbosity
        many: false,
      }),

      // with this field, you can add some Tags to Posts
      tags: relationship({
        // we could have used 'Tag', but then the relationship would only be 1-way
        ref: "Tag.posts",

        // a Post can have many Tags, not just one
        many: true,

        // this is some customisations for changing how this will look in the AdminUI
        ui: {
          displayMode: "cards",
          cardFields: ["name"],
          inlineEdit: { fields: ["name"] },
          linkToItem: true,
          inlineConnect: true,
          inlineCreate: { fields: ["name"] },
        },
      }),

      createdAt: timestamp({
        defaultValue: { kind: "now" },
      }),

      updatedAt: timestamp({
        defaultValue: { kind: "now" },
      }),
    },
  }),

  // this last list is our Tag list, it only has a name field for now
  Tag: list({
    access: allowAll,

    // setting this to isHidden for the user interface prevents this list being visible in the Admin UI
    ui: {
      isHidden: true,
    },

    // this is the fields for our Tag list
    fields: {
      name: text(),
      // this can be helpful to find out all the Posts associated with a Tag
      posts: relationship({ ref: "Post.tags", many: true }),
    },
  }),

  Facility: list({
    access: allowAll,
    fields: {
      name: text({ validation: { isRequired: true } }),
      sport: select({
        type: "string",
        options: [
          { label: "Basketball", value: "basketball" },
          { label: "Pickleball", value: "pickleball" },
          { label: "Soccer", value: "soccer" },
          { label: "Tennis", value: "tennis" },
          { label: "Volleyball", value: "volleyball" },
        ],
        validation: { isRequired: true },
        ui: {
          description: "The sport this facility is used for",
        },
      }),
      facilityType: select({
        type: "string",
        options: [
          { label: "Full Court", value: "full_court" },
          { label: "Half Court", value: "half_court" },
          { label: "Individual Rim", value: "rim" },
          { label: "Court", value: "court" },
          { label: "Pitch", value: "pitch" },
          { label: "Field", value: "field" },
        ],
        validation: { isRequired: true },
        ui: {
          description:
            "The type of facility (e.g., full court, half court, etc.)",
        },
      }),
      overlapsWith: relationship({
        ref: "Facility",
        many: true,
        ui: {
          displayMode: "cards",
          cardFields: ["name"],
          linkToItem: true,
          inlineConnect: true,
          inlineCreate: { fields: ["name"] },
        },
      }),
      programs: relationship({
        ref: "Program.facility",
        many: true,
      }),
      createdAt: timestamp({ defaultValue: { kind: "now" } }),
      updatedAt: timestamp({ defaultValue: { kind: "now" } }),
      bookable: checkbox({
        defaultValue: true,
        ui: {
          description:
            "If unchecked, this facility cannot be booked by customers.",
        },
      }),
      allowClashes: checkbox({
        defaultValue: false,
        ui: {
          description:
            "If checked, bookings for this facility can overlap (admin override).",
        },
      }),
      minBookingDurationMinutes: integer({
        defaultValue: 30,
        ui: { description: "Minimum booking duration in minutes (e.g. 30)" },
      }),
      maxBookingDurationMinutes: integer({
        defaultValue: 60,
        ui: { description: "Maximum booking duration in minutes (e.g. 60)" },
      }),
      openTime: text({
        ui: {
          description:
            "Optional: Facility open time (e.g. 08:00, overrides global)",
        },
      }),
      closeTime: text({
        ui: {
          description:
            "Optional: Facility close time (e.g. 22:00, overrides global)",
        },
      }),
    },
    ui: {
      listView: {
        initialColumns: ["name", "createdAt"],
      },
    },
  }),

  Program: list({
    access: allowAll,
    fields: {
      name: text({ validation: { isRequired: true } }),
      description: text({ validation: { isRequired: true } }),
      type: select({
        type: "string",
        options: [
          { label: "Camp", value: "camp" },
          { label: "Clinic", value: "clinic" },
          { label: "Training", value: "training" },
          { label: "Open Gym", value: "open_gym" },
        ],
        validation: { isRequired: true },
      }),
      startDate: timestamp({ validation: { isRequired: true } }),
      endDate: timestamp({ validation: { isRequired: true } }),
      capacity: integer({ validation: { isRequired: true } }),
      price: float({ validation: { isRequired: true } }),
      memberPrice: float({}),
      isActive: checkbox({ defaultValue: true }),
      isVisible: checkbox({
        defaultValue: true,
        ui: {
          description:
            "Controls whether this program is visible in the storefront",
        },
      }),
      customSessions: checkbox({
        defaultValue: false,
        ui: {
          description:
            "Enable to manually manage sessions for this program. WARNING: Switching from custom to recurring will delete all custom sessions!",
          group: "Sessions",
        },
      }),
      repeats: checkbox({
        defaultValue: true,
        ui: { description: "Does this program repeat?" },
      }),
      frequency: select({
        type: "string",
        options: [
          { label: "Daily", value: "daily" },
          { label: "Weekly", value: "weekly" },
        ],
        defaultValue: "daily",
        ui: { description: "How often does this program repeat?" },
      }),
      recurrenceEnds: select({
        type: "string",
        options: [
          { label: "Never", value: "never" },
          { label: "On date", value: "onDate" },
          { label: "After N occurrences", value: "afterN" },
        ],
        defaultValue: "never",
        ui: { description: "When does the recurrence end?" },
      }),
      recurrenceEndDate: calendarDay({
        ui: { description: "If recurrence ends on a date, specify it here." },
      }),
      recurrenceCount: integer({
        ui: {
          description: "If recurrence ends after N occurrences, specify N.",
        },
      }),
      facility: relationship({
        ref: "Facility.programs",
        many: false,
        ui: {
          displayMode: "select",
        },
      }),
      schedule: json({}),
      startTime: timestamp({
        validation: { isRequired: true },
        ui: {
          description:
            "Only the time part is used for recurring programs (e.g., 09:00)",
        },
      }),
      endTime: timestamp({
        validation: { isRequired: true },
        ui: {
          description:
            "Only the time part is used for recurring programs (e.g., 15:00)",
        },
      }),
      daysOfWeek: multiselect({
        options: [
          { label: "Monday", value: "mon" },
          { label: "Tuesday", value: "tue" },
          { label: "Wednesday", value: "wed" },
          { label: "Thursday", value: "thu" },
          { label: "Friday", value: "fri" },
          { label: "Saturday", value: "sat" },
          { label: "Sunday", value: "sun" },
        ],
      }),
      enrollments: relationship({
        ref: "Enrollment.program",
        many: true,
        ui: {
          displayMode: "cards",
          cardFields: [
            "customer",
            "participant",
            "dependent",
            "status",
            "enrolledAt",
          ],
          linkToItem: true,
          inlineCreate: {
            fields: ["customer", "participant", "dependent", "status"],
          },
          inlineEdit: { fields: ["status"] },
        },
      }),
      minAge: integer({}),
      maxAge: integer({}),
      createdAt: timestamp({ defaultValue: { kind: "now" } }),
      updatedAt: timestamp({ defaultValue: { kind: "now" } }),
      status: select({
        type: "string",
        options: [
          { label: "Upcoming", value: "upcoming" },
          { label: "Scheduled", value: "scheduled" },
          { label: "Cancelled", value: "cancelled" },
          { label: "Rescheduled", value: "rescheduled" },
        ],
        defaultValue: "upcoming",
        validation: { isRequired: true },
      }),
      computedStatus: virtual({
        field: graphql.field({
          type: graphql.String,
          resolve(item) {
            const { startDate, endDate, status } = item as any;
            const now = new Date();
            const start = toDate(startDate);
            const end = toDate(endDate);
            if (start && end && now >= start && now <= end) {
              return "In progress";
            }
            switch (status) {
              case "upcoming":
                return "Upcoming";
              case "scheduled":
                return "Scheduled";
              case "cancelled":
                return "Cancelled";
              case "rescheduled":
                return "Rescheduled";
              default:
                return "Unknown";
            }
          },
        }),
        ui: {
          createView: { fieldMode: "hidden" },
          itemView: { fieldMode: "read" },
          listView: { fieldMode: "read" },
        },
      }),
      enrollmentCount: virtual({
        field: graphql.field({
          type: graphql.Int,
          async resolve(item, args, context) {
            const { id } = item as { id: string };
            const count = await context.query.Enrollment.count({
              where: {
                program: { id: { equals: id } },
                status: { not: { equals: "cancelled" } },
              },
            });
            return count;
          },
        }),
        ui: {
          createView: { fieldMode: "hidden" },
          itemView: { fieldMode: "read" },
          listView: { fieldMode: "read" },
        },
      }),
      enrollmentStartDate: timestamp({ validation: {} }),
      enrollmentEndDate: timestamp({ validation: {} }),
      registrationOpen: virtual({
        field: graphql.field({
          type: graphql.Boolean,
          resolve(item) {
            const { enrollmentStartDate, enrollmentEndDate } = item as any;
            const now = new Date();
            const start = toDate(enrollmentStartDate);
            const end = toDate(enrollmentEndDate);
            return !!(start && end && now >= start && now <= end);
          },
        }),
        ui: {
          createView: { fieldMode: "hidden" },
          itemView: { fieldMode: "read" },
          listView: { fieldMode: "read" },
        },
      }),
      instructors: relationship({
        ref: "User.instructedPrograms",
        many: true,
        ui: {
          displayMode: "cards",
          cardFields: ["name"],
          linkToItem: true,
          inlineConnect: true,
          inlineCreate: { fields: ["name"] },
          inlineEdit: { fields: ["name"] },
        },
        hooks: {
          validateInput: async ({ resolvedData, context, operation }) => {
            if (operation === "create" || operation === "update") {
              const instructorIds =
                resolvedData.instructors?.connect?.map((c: any) => c.id) || [];
              if (instructorIds.length > 0) {
                const instructors = await context.query.User.findMany({
                  where: { id: { in: instructorIds } },
                  query: "id role",
                });

                const nonCoaches = instructors.filter(
                  (instructor) => instructor.role !== "COACH"
                );
                if (nonCoaches.length > 0) {
                  throw new Error(
                    "Only users with the COACH role can be assigned as instructors"
                  );
                }
              }
            }
          },
        },
      }),
      sessions: relationship({
        ref: "Session.program",
        many: true,
        ui: {
          displayMode: "cards",
          cardFields: ["date", "startTime", "endTime", "facility"],
          linkToItem: true,
          inlineCreate: {
            fields: ["date", "startTime", "endTime", "facility"],
          },
          inlineEdit: { fields: ["date", "startTime", "endTime", "facility"] },
          group: "Sessions",
        },
      }),
      requireEmergencyContactInfo: checkbox({
        defaultValue: false,
        ui: {
          description:
            "Request emergency contact info during checkout for this program.",
        },
      }),
      requireTShirtSize: checkbox({
        defaultValue: false,
        ui: {
          description: "Request T-shirt size during checkout for this program.",
        },
      }),
      allowDropIn: checkbox({
        defaultValue: false,
        ui: {
          description: "Allow drop-in (per-session) bookings for this program.",
        },
      }),
      dropInPrice: float({
        ui: {
          description:
            "Default price for drop-in sessions (overridden by session.dropInPrice if set).",
        },
      }),
    },
    ui: {
      listView: {
        initialColumns: [
          "name",
          "facility",
          "startDate",
          "endDate",
          "capacity",
          "price",
          "isActive",
        ],
      },
    },
    hooks: {
      async afterOperation({ operation, item, context, originalItem }) {
        if (operation !== "create" && operation !== "update") return;
        const {
          id,
          startDate,
          endDate,
          daysOfWeek,
          startTime,
          endTime,
          facility,
          customSessions,
          repeats,
          frequency,
          recurrenceEnds,
          recurrenceEndDate,
          recurrenceCount,
        } = item as any;
        if (customSessions) return; // Do not auto-generate if custom sessions enabled
        // If toggling from custom to recurring, nuke all sessions
        if (
          operation === "update" &&
          originalItem?.customSessions &&
          !customSessions
        ) {
          // Delete all sessions for this program
          const sessions = await context.query.Session.findMany({
            where: { program: { id: { equals: id } } },
            query: "id",
          });
          for (const session of sessions) {
            await context.query.Session.deleteOne({
              where: { id: session.id },
            });
          }
        }
        if (!startDate || !endDate || !startTime || !endTime) return;
        // Recurrence logic
        let sessionDates: string[] = [];
        let current = new Date(startDate);
        let end = new Date(endDate);
        // Determine end condition
        if (repeats) {
          if (recurrenceEnds === "onDate" && recurrenceEndDate) {
            end = new Date(recurrenceEndDate);
          } else if (recurrenceEnds === "afterN" && recurrenceCount) {
            // We'll generate up to N occurrences
            let count = 0;
            while (current <= end && count < recurrenceCount) {
              sessionDates.push(current.toISOString().slice(0, 10));
              if (frequency === "weekly") {
                current.setDate(current.getDate() + 7);
              } else {
                current.setDate(current.getDate() + 1);
              }
              count++;
            }
            // Generate sessions and return
            for (const dateStr of sessionDates) {
              await context.query.Session.createOne({
                data: {
                  program: { connect: { id } },
                  date: dateStr,
                  startTime,
                  endTime,
                  facility: facility
                    ? { connect: { id: facility?.id || facility } }
                    : undefined,
                },
              });
            }
            return;
          }
        }
        // Map daysOfWeek values to JS day numbers (0=Sun, 1=Mon, ...)
        const dayMap = {
          mon: 1,
          tue: 2,
          wed: 3,
          thu: 4,
          fri: 5,
          sat: 6,
          sun: 0,
        };
        type DayKey = keyof typeof dayMap;
        const days = Array.isArray(daysOfWeek) ? daysOfWeek : [];
        const allowedDays = days.map((d: string) => dayMap[d as DayKey]);
        // Generate dates in range
        current = new Date(startDate);
        let occurrences = 0;
        while (current <= end) {
          if (
            (!repeats && occurrences === 0) ||
            (repeats &&
              (allowedDays.length === 0 ||
                allowedDays.includes(current.getDay())))
          ) {
            sessionDates.push(current.toISOString().slice(0, 10));
            occurrences++;
          }
          if (frequency === "weekly") {
            current.setDate(current.getDate() + 7);
          } else {
            current.setDate(current.getDate() + 1);
          }
          if (
            recurrenceEnds === "afterN" &&
            recurrenceCount &&
            occurrences >= recurrenceCount
          )
            break;
        }
        // Bulk create sessions
        for (const dateStr of sessionDates) {
          await context.query.Session.createOne({
            data: {
              program: { connect: { id } },
              date: dateStr,
              startTime,
              endTime,
              facility: facility
                ? { connect: { id: facility?.id || facility } }
                : undefined,
            },
          });
        }
      },
    },
  }),

  Enrollment: list({
    access: allowAll,
    fields: {
      program: relationship({
        ref: "Program.enrollments",
        many: false,
      }),
      session: relationship({
        ref: "Session",
        many: false,
        ui: {
          description:
            "If set, this enrollment is for a specific session (drop-in).",
        },
      }),
      customer: relationship({
        ref: "User.enrollments",
        many: false,
      }),
      participant: relationship({
        ref: "User.participantEnrollments",
        many: false,
      }),
      dependent: relationship({
        ref: "Dependent.participantEnrollments",
        many: false,
      }),
      status: select({
        type: "string",
        options: [
          { label: "Pending", value: "pending" },
          { label: "Confirmed", value: "confirmed" },
          { label: "Cancelled", value: "cancelled" },
          { label: "Completed", value: "completed" },
        ],
        defaultValue: "pending",
        validation: { isRequired: true },
      }),
      enrolledAt: timestamp({
        defaultValue: { kind: "now" },
      }),
      updatedAt: timestamp({
        defaultValue: { kind: "now" },
      }),
    },
    ui: {
      listView: {
        initialColumns: [
          "program",
          "session",
          "customer",
          "participant",
          "dependent",
          "status",
          "enrolledAt",
        ],
      },
    },
  }),

  Waiver: list({
    access: allowAll,
    fields: {
      title: text({ validation: { isRequired: true } }),
      text: text({
        validation: { isRequired: true },
        ui: { displayMode: "textarea" },
      }),
      version: text({ validation: { isRequired: true } }),
      createdAt: timestamp({ defaultValue: { kind: "now" } }),
      acceptances: relationship({ ref: "WaiverAcceptance.waiver", many: true }),
    },
    ui: {
      listView: { initialColumns: ["title", "version", "createdAt"] },
    },
  }),

  WaiverAcceptance: list({
    access: allowAll,
    fields: {
      waiver: relationship({ ref: "Waiver.acceptances", many: false }),
      customer: relationship({ ref: "User.waiverAcceptances", many: false }),
      dependent: relationship({
        ref: "Dependent.waiverAcceptances",
        many: false,
      }),
      acceptedAt: timestamp({ defaultValue: { kind: "now" } }),
    },
    ui: {
      listView: {
        initialColumns: ["waiver", "customer", "dependent", "acceptedAt"],
      },
    },
  }),

  Session: list({
    access: allowAll,
    fields: {
      program: relationship({
        ref: "Program.sessions",
        many: false,
        ui: { displayMode: "select" },
      }),
      date: calendarDay({ validation: { isRequired: true } }),
      startTime: timestamp({
        validation: { isRequired: true },
        ui: { description: "Time only" },
      }),
      endTime: timestamp({
        validation: { isRequired: true },
        ui: { description: "Time only" },
      }),
      facility: relationship({
        ref: "Facility",
        many: false,
        ui: { displayMode: "select" },
      }),
      dropInPrice: float({
        ui: {
          description:
            "Override price for this drop-in session (fallback: program.dropInPrice, then program.price).",
        },
      }),
      createdAt: timestamp({ defaultValue: { kind: "now" } }),
      updatedAt: timestamp({ defaultValue: { kind: "now" } }),
    },
    ui: {
      listView: {
        initialColumns: [
          "program",
          "date",
          "startTime",
          "endTime",
          "facility",
          "dropInPrice",
          "createdAt",
        ],
      },
    },
  }),

  FacilityRental: list({
    access: allowAll, // Add proper access control in production!
    fields: {
      facility: relationship({ ref: "Facility", many: false }),
      customer: relationship({ ref: "User", many: false }),
      startTime: timestamp({ validation: { isRequired: true } }),
      endTime: timestamp({ validation: { isRequired: true } }),
      status: select({
        type: "string",
        options: [
          { label: "Pending", value: "pending" },
          { label: "Confirmed", value: "confirmed" },
          { label: "Cancelled", value: "cancelled" },
          { label: "Expired", value: "expired" },
        ],
        defaultValue: "pending",
      }),
      holdExpiresAt: timestamp({
        ui: {
          description: "If set, this rental is only reserved until this time.",
        },
      }),
      createdAt: timestamp({ defaultValue: { kind: "now" } }),
      updatedAt: timestamp({ defaultValue: { kind: "now" } }),
    },
    hooks: {
      async validateInput({ resolvedData, context, operation }) {
        if (operation === "create" || operation === "update") {
          const { facility, startTime, endTime, status, holdExpiresAt } =
            resolvedData;
          if (!facility || !startTime || !endTime) return;
          // Check allowClashes on facility
          const facilityId = facility.connect?.id || facility;
          const facilityRecord = await context.query.Facility.findOne({
            where: { id: facilityId },
            query:
              "id allowClashes minBookingDurationMinutes maxBookingDurationMinutes",
          });
          // Duration validation
          const durationMs = new Date(endTime) - new Date(startTime);
          const durationMin = durationMs / (1000 * 60);
          if (
            facilityRecord?.minBookingDurationMinutes &&
            durationMin < facilityRecord.minBookingDurationMinutes
          ) {
            throw new Error(
              `Minimum booking duration for this facility is ${facilityRecord.minBookingDurationMinutes} minutes.`
            );
          }
          if (
            facilityRecord?.maxBookingDurationMinutes &&
            durationMin > facilityRecord.maxBookingDurationMinutes
          ) {
            throw new Error(
              `Maximum booking duration for this facility is ${facilityRecord.maxBookingDurationMinutes} minutes.`
            );
          }
          if (!facilityRecord?.allowClashes) {
            // Enhanced clash check: include confirmed and pending (not expired) rentals
            const now = new Date();
            const clashes = await context.query.FacilityRental.findMany({
              where: {
                facility: { id: { equals: facilityId } },
                status: { in: ["confirmed", "pending"] },
                OR: [
                  { holdExpiresAt: { gt: now.toISOString() } },
                  { status: { equals: "confirmed" } },
                ],
                startTime: { lt: endTime },
                endTime: { gt: startTime },
              },
              query: "id",
            });
            if (clashes.length > 0) {
              throw new Error(
                "This facility is already booked or reserved for the selected time."
              );
            }
            // Also check for session clashes
            const rentalStart = new Date(startTime);
            const rentalEnd = new Date(endTime);
            const rentalDate = rentalStart.toISOString().slice(0, 10);
            const sessionClashes = await context.query.Session.findMany({
              where: {
                facility: { id: { equals: facilityId } },
                date: { equals: rentalDate },
                startTime: { lt: endTime },
                endTime: { gt: startTime },
              },
              query: "id",
            });
            if (sessionClashes.length > 0) {
              throw new Error(
                "This facility is already booked for a program session at the selected time."
              );
            }
          }
          // else: allowClashes is true, so skip clash check
        }
      },
    },
  }),

  Payment: list({
    access: allowAll,
    fields: {
      amount: float({ validation: { isRequired: true } }),
      status: select({
        type: "string",
        options: [
          { label: "Pending", value: "pending" },
          { label: "Completed", value: "completed" },
          { label: "Failed", value: "failed" },
          { label: "Refunded", value: "refunded" },
        ],
        defaultValue: "pending",
        validation: { isRequired: true },
      }),
      stripePaymentIntentId: text({ validation: { isRequired: true } }),
      customer: relationship({ ref: "User", many: false }),
      invoice: relationship({ ref: "Invoice.payment", many: false }),
      createdAt: timestamp({ defaultValue: { kind: "now" } }),
      updatedAt: timestamp({ defaultValue: { kind: "now" } }),
    },
    ui: {
      listView: {
        initialColumns: ["amount", "status", "customer", "createdAt"],
      },
    },
  }),

  Invoice: list({
    access: allowAll,
    fields: {
      amount: float({ validation: { isRequired: true } }),
      status: select({
        type: "string",
        options: [
          { label: "Draft", value: "draft" },
          { label: "Paid", value: "paid" },
          { label: "Void", value: "void" },
        ],
        defaultValue: "draft",
        validation: { isRequired: true },
      }),
      payment: relationship({ ref: "Payment.invoice", many: false }),
      customer: relationship({ ref: "User", many: false }),
      createdAt: timestamp({ defaultValue: { kind: "now" } }),
      updatedAt: timestamp({ defaultValue: { kind: "now" } }),
    },
    ui: {
      listView: {
        initialColumns: ["amount", "status", "customer", "createdAt"],
      },
    },
  }),

  Refund: list({
    access: allowAll,
    fields: {
      amount: float({ validation: { isRequired: true } }),
      status: select({
        type: "string",
        options: [
          { label: "Pending", value: "pending" },
          { label: "Completed", value: "completed" },
          { label: "Failed", value: "failed" },
        ],
        defaultValue: "pending",
        validation: { isRequired: true },
      }),
      stripeChargeId: text({ validation: { isRequired: true } }),
      customer: relationship({ ref: "User", many: false }),
      createdAt: timestamp({ defaultValue: { kind: "now" } }),
      updatedAt: timestamp({ defaultValue: { kind: "now" } }),
    },
    ui: {
      listView: {
        initialColumns: ["amount", "status", "customer", "createdAt"],
      },
    },
  }),

  TrainingPackage: list({
    access: allowAll,
    fields: {
      name: text({ validation: { isRequired: true } }),
      description: text({}),
      sessionCount: integer({ validation: { isRequired: true } }),
      price: float({ validation: { isRequired: true } }),
      isActive: checkbox({ defaultValue: true }),
      createdAt: timestamp({ defaultValue: { kind: "now" } }),
      updatedAt: timestamp({ defaultValue: { kind: "now" } }),
      purchasedPackages: relationship({
        ref: "PurchasedPackage.package",
        many: true,
      }),
    },
    ui: {
      listView: {
        initialColumns: ["name", "sessionCount", "price", "isActive"],
      },
    },
  }),

  PurchasedPackage: list({
    access: allowAll,
    fields: {
      package: relationship({
        ref: "TrainingPackage.purchasedPackages",
        many: false,
      }),
      customer: relationship({ ref: "User", many: false }),
      dependent: relationship({ ref: "Dependent", many: false }),
      sessionsRemaining: integer({ validation: { isRequired: true } }),
      sessionsUsed: integer({ defaultValue: 0 }),
      purchasedAt: timestamp({ defaultValue: { kind: "now" } }),
      trainingSessions: relationship({
        ref: "TrainingSession.purchasedPackage",
        many: true,
      }),
      // Optionally link to payment/invoice
      payment: relationship({ ref: "Payment", many: false }),
      invoice: relationship({ ref: "Invoice", many: false }),
    },
    ui: {
      listView: {
        initialColumns: [
          "package",
          "customer",
          "dependent",
          "sessionsRemaining",
          "sessionsUsed",
        ],
      },
    },
  }),

  TrainingSession: list({
    access: allowAll,
    fields: {
      purchasedPackage: relationship({
        ref: "PurchasedPackage.trainingSessions",
        many: false,
      }),
      coach: relationship({ ref: "User", many: false }),
      customer: relationship({ ref: "User", many: false }),
      dependent: relationship({ ref: "Dependent", many: false }),
      facility: relationship({ ref: "Facility", many: false }),
      scheduledAt: timestamp({ validation: { isRequired: true } }),
      startTime: timestamp({ validation: { isRequired: true } }),
      endTime: timestamp({ validation: { isRequired: true } }),
      status: select({
        type: "string",
        options: [
          { label: "Scheduled", value: "scheduled" },
          { label: "Completed", value: "completed" },
          { label: "Cancelled", value: "cancelled" },
        ],
        defaultValue: "scheduled",
      }),
      notes: text({ ui: { displayMode: "textarea" } }),
      createdAt: timestamp({ defaultValue: { kind: "now" } }),
      updatedAt: timestamp({ defaultValue: { kind: "now" } }),
    },
    ui: {
      listView: {
        initialColumns: [
          "purchasedPackage",
          "coach",
          "customer",
          "dependent",
          "facility",
          "startTime",
          "status",
        ],
      },
    },
  }),

  // Open Gym is now a type of Program (type: 'open_gym').
} satisfies Lists;
