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
        // Hooks supprimés - la logique est maintenant dans les contrôleurs
        // pour un meilleur contrôle et éviter les effets de bord
      }
    }
  );

  return Interview;
};