import { z } from "zod"
import { TRPCError } from "@trpc/server"
import { router, protectedProcedure, publicProcedure } from "../trpc"
import {
  getEasyboxLocations,
  createEasyboxShipment,
  trackShipment,
  SamedayError,
} from "@/server/sameday"

export const shippingRouter = router({
  /**
   * Create an EasyBox shipment for an order.
   * Must be called by the seller of the order after the order is paid.
   */
  createShipment: protectedProcedure
    .input(
      z.object({
        orderId: z.string().min(1),
        lockerId: z.number().int().positive(),
        parcels: z
          .array(
            z.object({
              weight: z.number().positive(),
              width: z.number().positive(),
              height: z.number().positive(),
              length: z.number().positive(),
            }),
          )
          .min(1)
          .max(10),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const userId = (ctx.user as { id: string }).id

      // Fetch the order and verify the current user is the seller
      const order = await ctx.prisma.order.findUnique({
        where: { id: input.orderId },
        include: {
          shipment: true,
          buyer: {
            select: { name: true, phone: true, email: true },
          },
          seller: {
            select: { name: true, phone: true, email: true },
          },
        },
      })

      if (!order) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Comanda nu a fost gasita",
        })
      }

      if (order.sellerId !== userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Nu esti vanzatorul acestei comenzi",
        })
      }

      if (order.status !== "PAID") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Comanda nu a fost platita inca",
        })
      }

      if (order.shipment) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Exista deja o expeditie pentru aceasta comanda",
        })
      }

      // Ensure seller has required contact info
      const senderName = order.seller.name
      const senderPhone = order.seller.phone

      if (!senderName || !senderPhone) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Completeaza datele de contact in profilul tau inainte de a expedia",
        })
      }

      // Ensure buyer has required contact info
      const recipientName = order.buyer.name
      const recipientPhone = order.buyer.phone

      if (!recipientName || !recipientPhone) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cumparatorul nu are date de contact complete",
        })
      }

      try {
        const shipment = await createEasyboxShipment({
          orderId: input.orderId,
          lockerId: input.lockerId,
          recipient: {
            name: recipientName,
            phone: recipientPhone,
            email: order.buyer.email ?? undefined,
          },
          sender: {
            name: senderName,
            phone: senderPhone,
            email: order.seller.email ?? undefined,
          },
          parcels: input.parcels,
        })

        return {
          awb: shipment.awbNumber,
          awbNumber: shipment.awbNumber,
          pickupCode: shipment.pickupCode,
          trackingUrl: shipment.trackingUrl,
          estimatedDelivery: shipment.estimatedDelivery,
        }
      } catch (e) {
        if (e instanceof SamedayError) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Eroare Sameday: ${e.message}`,
          })
        }
        throw e
      }
    }),

  /**
   * Get Sameday EasyBox locker locations.
   * Optionally filter by city.
   */
  getLocations: publicProcedure
    .input(
      z
        .object({
          city: z.string().optional(),
        })
        .optional(),
    )
    .query(async ({ input }) => {
      try {
        const locations = await getEasyboxLocations(input?.city)
        return { locations }
      } catch (e) {
        if (e instanceof SamedayError) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Eroare Sameday: ${e.message}`,
          })
        }
        throw e
      }
    }),

  /**
   * Track a shipment by AWB number.
   */
  trackShipment: publicProcedure
    .input(
      z.object({
        awbNumber: z.string().min(1),
      }),
    )
    .query(async ({ input }) => {
      try {
        const tracking = await trackShipment(input.awbNumber)
        return tracking
      } catch (e) {
        if (e instanceof SamedayError) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: `Eroare Sameday: ${e.message}`,
          })
        }
        throw e
      }
    }),

  /**
   * Get shipment details for a specific order.
   * Available to both buyer and seller of that order.
   */
  getByOrderId: protectedProcedure
    .input(
      z.object({
        orderId: z.string().min(1),
      }),
    )
    .query(async ({ ctx, input }) => {
      const userId = (ctx.user as { id: string }).id

      const shipment = await ctx.prisma.shipment.findUnique({
        where: { orderId: input.orderId },
      })

      if (!shipment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Nu exista o expeditie pentru aceasta comanda",
        })
      }

      // Verify the user is either buyer or seller
      const order = await ctx.prisma.order.findUnique({
        where: { id: input.orderId },
        select: { buyerId: true, sellerId: true },
      })

      if (!order) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Comanda nu a fost gasita",
        })
      }

      if (order.buyerId !== userId && order.sellerId !== userId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Nu ai acces la aceasta expeditie",
        })
      }

      return shipment
    }),
})
