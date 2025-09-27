"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class Application extends Model {
    static associate(models) {
      Application.belongsTo(models.Candidate, {
        foreignKey: "candidate_id",
        as: "candidate"
      });

      Application.belongsTo(models.JobOffer, {
        foreignKey: "job_offer_id",
        as: "jobOffer"
      });

      Application.belongsTo(models.CandidateCV, {
        foreignKey: "cv_id",
        as: "cv"
      });
    }
  }

  Application.init(
    {
      candidate_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'Candidates',
          key: 'id'
        }
      },
      job_offer_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'JobOffers',
          key: 'id'
        }
      },
      cv_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'CandidateCVs',
          key: 'id'
        }
      },
      cover_letter: {
        type: DataTypes.TEXT,
        allowNull: false,
        validate: {
          notEmpty: true,
          len: [50, 5000]
        }
      },
      status: {
        type: DataTypes.ENUM('applied', 'under_review', 'interview_scheduled', 'interview_completed', 'accepted', 'rejected'),
        allowNull: false,
        defaultValue: 'applied'
      },
      proposed_interview_slots: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: []
      },
      confirmed_interview_date: {
        type: DataTypes.DATE,
        allowNull: true
      },
      interview_link: {
        type: DataTypes.STRING,
        allowNull: true
      },
      recruiter_notes: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      applied_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    },
    {
      sequelize,
      modelName: "Application",
      tableName: "Applications",
      hooks: {
        afterCreate: async (application, options) => {
          // Incrémenter le compteur de candidatures de l'offre
          const jobOffer = await sequelize.models.JobOffer.findByPk(application.job_offer_id, {
            transaction: options.transaction
          });
          
          if (jobOffer) {
            await jobOffer.increment('applications_count', {
              transaction: options.transaction
            });
          }
        },

        afterDestroy: async (application, options) => {
          // Décrémenter le compteur de candidatures de l'offre
          const jobOffer = await sequelize.models.JobOffer.findByPk(application.job_offer_id, {
            transaction: options.transaction
          });
          
          if (jobOffer && jobOffer.applications_count > 0) {
            await jobOffer.decrement('applications_count', {
              transaction: options.transaction
            });
          }
        }
      }
    }
  );

  return Application;
};