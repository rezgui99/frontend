"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class CandidateCV extends Model {
    static associate(models) {
      CandidateCV.belongsTo(models.Candidate, {
        foreignKey: "candidate_id",
        as: "candidate"
      });

      CandidateCV.hasMany(models.Application, {
        foreignKey: "cv_id",
        as: "applications"
      });
    }
  }

  CandidateCV.init(
    {
      candidate_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'Candidates',
          key: 'id'
        }
      },
      title: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: true,
          len: [3, 100]
        }
      },
      file_path: {
        type: DataTypes.STRING,
        allowNull: false
      },
      file_name: {
        type: DataTypes.STRING,
        allowNull: false
      },
      file_size: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      is_primary: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      }
    },
    {
      sequelize,
      modelName: "CandidateCV",
      tableName: "CandidateCVs",
      hooks: {
        beforeCreate: async (cv, options) => {
          // Si c'est le premier CV du candidat, le marquer comme principal
          const existingCVs = await CandidateCV.count({
            where: { candidate_id: cv.candidate_id },
            transaction: options.transaction
          });
          
          if (existingCVs === 0) {
            cv.is_primary = true;
          }
        },
        afterCreate: async (cv, options) => {
          // Si marqué comme principal, désactiver les autres
          if (cv.is_primary) {
            await CandidateCV.update(
              { is_primary: false },
              {
                where: {
                  candidate_id: cv.candidate_id,
                  id: { [sequelize.Sequelize.Op.ne]: cv.id }
                },
                transaction: options.transaction
              }
            );
          }
        }
      }
    }
  );

  return CandidateCV;
};