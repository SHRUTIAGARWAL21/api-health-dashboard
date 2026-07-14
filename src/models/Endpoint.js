import mongoose from 'mongoose'

const EndpointSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    ownerEmail: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true },
    method: {
      type: String,
      enum: ['GET', 'HEAD'],
      default: 'GET',
    },
    expectedStatus: { type: Number, default: 200 },
    lastAlertSentAt: { type: Date },
  },
  { timestamps: true }
)

export default mongoose.models.Endpoint ||
  mongoose.model('Endpoint', EndpointSchema)
