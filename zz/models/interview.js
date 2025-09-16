"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Interview extends Model {
    static associate(models) {
      Interview.belongsTo(models.Application, {
        foreignKey: "application_id",
        as: "application"
      });

      Interview.belongsTo(models.User, {
        foreignKey: "interviewer_id",
        as: "interviewer"
      });
    }
  }

  Interview.init(
    {
      application_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'Applications',
          key: 'id'
        }
      },
      interviewer_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        }
      },
      scheduled_date: {
        type: DataTypes.DATE,
        allowNull: false,
        validate: {
          isDate: true,
          isAfter: new Date().toISOString()
        }
      },
      duration_minutes: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 60,
        validate: {
          min: 15,
          max: 240
        }
      },
      interview_type: {
        type: DataTypes.ENUM('phone', 'video', 'in_person'),
        allowNull: false,
        defaultValue: 'video'
      },
      location: {
        type: DataTypes.STRING,
        allowNull: true
      },
      meeting_link: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          isUrl: true
        }
      },
      contact_phone: {
        type: DataTypes.STRING,
        allowNull: true
      },
      status: {
        type: DataTypes.ENUM('draft', 'scheduled', 'completed', 'canceled'),
        allowNull: false,
        defaultValue: 'draft'
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      score: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
          min: 0,
          max: 100
        }
      },
      feedback: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      decision: {
        type: DataTypes.ENUM('pending', 'pass', 'fail', 'on_hold'),
        allowNull: false,
        defaultValue: 'pending'
      },
      timezone: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: 'Europe/Paris'
      },
      starts_at_utc: {
        type: DataTypes.DATE,
        allowNull: false
      },
      ends_at_utc: {
        type: DataTypes.DATE,
        allowNull: false
      },
      reminder_sent: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      timezone: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: 'Europe/Paris'
      },
      starts_at_utc: {
        type: DataTypes.DATE,
        allowNull: true
      },
      ends_at_utc: {
        type: DataTypes.DATE,
        allowNull: true
      }
    },
    {
      sequelize,
      modelName: "Interview",
      tableName: "Interviews",
      hooks: {
        beforeCreate: async (interview) => {
          // Calculer les heures UTC si pas définies
          if (interview.scheduled_date && !interview.starts_at_utc) {
            interview.starts_at_utc = new Date(interview.scheduled_date);
          }
          if (interview.scheduled_date && interview.duration_minutes && !interview.ends_at_utc) {
            const endTime = new Date(interview.scheduled_date);
            endTime.setMinutes(endTime.getMinutes() + interview.duration_minutes);
            interview.ends_at_utc = endTime;
          }
        },
        beforeUpdate: async (interview) => {
          // Recalculer les heures UTC si scheduled_date ou duration change
          if (interview.changed('scheduled_date') || interview.changed('duration_minutes')) {
            if (interview.scheduled_date) {
              interview.starts_at_utc = new Date(interview.scheduled_date);
              const endTime = new Date(interview.scheduled_date);
              endTime.setMinutes(endTime.getMinutes() + (interview.duration_minutes || 60));
              interview.ends_at_utc = endTime;
            }
          }
        }
      }
    }
  );

  return Interview;
};