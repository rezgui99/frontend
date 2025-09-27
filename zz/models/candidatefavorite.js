"use strict";
const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
  class CandidateFavorite extends Model {
    static associate(models) {
      CandidateFavorite.belongsTo(models.Candidate, {
        foreignKey: "candidate_id",
        as: "candidate"
      });

      CandidateFavorite.belongsTo(models.JobOffer, {
        foreignKey: "job_offer_id",
        as: "jobOffer"
      });
    }
  }

  CandidateFavorite.init(
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
      }
    },
    {
      sequelize,
      modelName: "CandidateFavorite",
      tableName: "CandidateFavorites",
      indexes: [
        {
          unique: true,
          fields: ['candidate_id', 'job_offer_id']
        }
      ]
    }
  );

  return CandidateFavorite;
};