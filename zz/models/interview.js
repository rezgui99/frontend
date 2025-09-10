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
        type: DataTypes.ENUM('phone', 'video', 'in_person', 'technical', 'hr', 'final'),
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
      status: {
        type: DataTypes.ENUM('scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'rescheduled'),
        allowNull: false,
        defaultValue: 'scheduled'
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
      reminder_sent: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      }
    },
    {
      sequelize,
      modelName: "Interview",
      tableName: "Interviews",
      hooks: {
        afterCreate: async (interview, options) => {
          // Mettre à jour le statut de la candidature
          const application = await sequelize.models.Application.findByPk(interview.application_id, {
            transaction: options.transaction
          });
          
          if (application && application.status === 'under_review') {
            await application.update({
              status: 'interview_scheduled',
              confirmed_interview_date: interview.scheduled_date,
              interview_link: interview.meeting_link
            }, {
              transaction: options.transaction
            });
          }
        },
        
        afterUpdate: async (interview, options) => {
          // Mettre à jour le statut de la candidature selon le statut de l'entretien
          if (interview.changed('status')) {
            const application = await sequelize.models.Application.findByPk(interview.application_id, {
              transaction: options.transaction
            });
            
            if (application) {
              let newStatus = application.status;
              
              if (interview.status === 'completed') {
                newStatus = 'interview_completed';
              } else if (interview.status === 'cancelled') {
                newStatus = 'under_review';
              }
              
              if (newStatus !== application.status) {
                await application.update({ status: newStatus }, {
                  transaction: options.transaction
                });
              }
            }
          }
        }
      }
    }
  );

  return Interview;
};