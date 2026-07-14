import mongoose from 'mongoose'

const PingLogSchema = new mongoose.Schema(
  {
    endpointId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Endpoint',
      required: true,
    },
    status: { type: Number, required: true },
    responseTime: { type: Number, required: true },
    errorMessage: { type: String },
  },
  { timestamps: true }
)

PingLogSchema.index({ endpointId: 1, createdAt: -1 })
PingLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 14 })

export default mongoose.models.PingLog ||
  mongoose.model('PingLog', PingLogSchema)
