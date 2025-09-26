"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class JobOffer extends Model {
    static associate(models) {
      // Relation avec JobDescription
      JobOffer.belongsTo(models.JobDescription, {
        foreignKey: "job_description_id",
        as: "jobDescription"
      });

      // Relation avec User (créateur)
      JobOffer.belongsTo(models.User, {
        foreignKey: "created_by",
        as: "creator"
      });

      // Relations pour les candidatures (à implémenter plus tard)
      // JobOffer.hasMany(models.Application, {
      //   foreignKey: "job_offer_id",
      //   as: "applications"
      // });
    }
  }

  JobOffer.init(
    {
      title: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: true,
          len: [5, 200]
        }
      },
      company: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: true
        }
      },
      location: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: true
        }
      },
      salary_min: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
          min: 0
        }
      },
      salary_max: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
          min: 0
        }
      },
      contract_type: {
        type: DataTypes.ENUM('CDI', 'CDD', 'Stage', 'Freelance', 'Apprentissage'),
        allowNull: false,
        defaultValue: 'CDI'
      },
      work_mode: {
        type: DataTypes.ENUM('Présentiel', 'Télétravail', 'Hybride', 'Flexible'),
        allowNull: false,
        defaultValue: 'Hybride'
      },
      application_deadline: {
        type: DataTypes.DATE,
        allowNull: false,
        validate: {
          isDate: true,
          isAfter: new Date().toISOString().split('T')[0] // Doit être dans le futur
        }
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: false,
        validate: {
          notEmpty: true,
          len: [50, 5000]
        }
      },
      requirements: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: []
      },
      benefits: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: []
      },
      job_description_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'JobDescriptions',
          key: 'id'
        }
      },
      status: {
        type: DataTypes.ENUM('draft', 'published', 'closed'),
        allowNull: false,
        defaultValue: 'draft'
      },
      created_by: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        }
      },
      published_at: {
        type: DataTypes.DATE,
        allowNull: true
      },
      views_count: {
        type: DataTypes.INTEGER,
        defaultValue: 0
      },
      applications_count: {
        type: DataTypes.INTEGER,
        defaultValue: 0
      }
    },
    {
      sequelize,
      modelName: "JobOffer",
      tableName: "JobOffers",
      hooks: {
        beforeUpdate: (jobOffer) => {
          // Mettre à jour published_at quand le statut passe à 'published'
          if (jobOffer.changed('status') && jobOffer.status === 'published' && !jobOffer.published_at) {
            jobOffer.published_at = new Date();
          }
        }
      }
    }
  );

  return JobOffer;
};