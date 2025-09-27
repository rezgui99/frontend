"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class CandidateSkill extends Model {
    static associate(models) {
      CandidateSkill.belongsTo(models.Candidate, {
        foreignKey: "candidate_id",
        as: "candidate"
      });

      CandidateSkill.belongsTo(models.Skill, {
        foreignKey: "skill_id",
        as: "skill"
      });

      CandidateSkill.belongsTo(models.SkillLevel, {
        foreignKey: "skill_level_id",
        as: "skillLevel"
      });
    }
  }

  CandidateSkill.init(
    {
      candidate_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'Candidates',
          key: 'id'
        }
      },
      skill_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'Skills',
          key: 'id'
        }
      },
      skill_level_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'SkillLevels',
          key: 'id'
        }
      },
      years_experience: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: {
          min: 0,
          max: 50
        }
      },
      certification: {
        type: DataTypes.STRING,
        allowNull: true
      }
    },
    {
      sequelize,
      modelName: "CandidateSkill",
      tableName: "CandidateSkills",
      indexes: [
        {
          unique: true,
          fields: ['candidate_id', 'skill_id']
        }
      ]
    }
  );

  return CandidateSkill;
};