export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      products: {
        Row: {
          id: string
          name: string
          category: string
          subcategory: string | null
          description: string
          price_per_sqm: number
          photo_url: string
          characteristics: Json
          stock_quantity: number
          is_active: boolean
          unit: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          category: string
          subcategory?: string | null
          description?: string
          price_per_sqm: number
          photo_url?: string
          characteristics?: Json
          stock_quantity?: number
          is_active?: boolean
          unit?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          category?: string
          subcategory?: string | null
          description?: string
          price_per_sqm?: number
          photo_url?: string
          characteristics?: Json
          stock_quantity?: number
          is_active?: boolean
          unit?: string
          created_at?: string
          updated_at?: string
        }
      }
      customers: {
        Row: {
          id: string
          name: string
          phone: string
          email: string
          company_name: string
          address: string
          notes: string
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          phone: string
          email?: string
          company_name?: string
          address?: string
          notes?: string
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          phone?: string
          email?: string
          company_name?: string
          address?: string
          notes?: string
          created_at?: string
        }
      }
      orders: {
        Row: {
          id: string
          order_number: string
          customer_id: string
          status: string
          total_amount: number
          delivery_cost: number
          delivery_type: string
          delivery_address: string
          delivery_date: string | null
          notes: string
          source: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          order_number?: string
          customer_id: string
          status?: string
          total_amount?: number
          delivery_cost?: number
          delivery_type?: string
          delivery_address?: string
          delivery_date?: string | null
          notes?: string
          source?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          order_number?: string
          customer_id?: string
          status?: string
          total_amount?: number
          delivery_cost?: number
          delivery_type?: string
          delivery_address?: string
          delivery_date?: string | null
          notes?: string
          source?: string
          created_at?: string
          updated_at?: string
        }
      }
      order_items: {
        Row: {
          id: string
          order_id: string
          product_id: string
          quantity: number
          price_per_sqm: number
          subtotal: number
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          product_id: string
          quantity: number
          price_per_sqm: number
          subtotal: number
          created_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          product_id?: string
          quantity?: number
          price_per_sqm?: number
          subtotal?: number
          created_at?: string
        }
      }
      order_history: {
        Row: {
          id: string
          order_id: string
          user_id: string | null
          action_type: string
          old_status: string
          new_status: string
          comment: string
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          user_id?: string | null
          action_type: string
          old_status?: string
          new_status?: string
          comment?: string
          created_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          user_id?: string | null
          action_type?: string
          old_status?: string
          new_status?: string
          comment?: string
          created_at?: string
        }
      }
      vehicles: {
        Row: {
          id: string
          name: string
          type: string
          capacity: number
          license_plate: string
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          type: string
          capacity: number
          license_plate: string
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          type?: string
          capacity?: number
          license_plate?: string
          is_active?: boolean
          created_at?: string
        }
      }
      deliveries: {
        Row: {
          id: string
          order_id: string
          vehicle_id: string | null
          scheduled_date: string
          actual_date: string | null
          status: string
          driver_notes: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          order_id: string
          vehicle_id?: string | null
          scheduled_date: string
          actual_date?: string | null
          status?: string
          driver_notes?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          vehicle_id?: string | null
          scheduled_date?: string
          actual_date?: string | null
          status?: string
          driver_notes?: string
          created_at?: string
          updated_at?: string
        }
      }
      order_delivery_trips: {
        Row: {
          id: string
          order_id: string
          vehicle_type: string
          trip_count: number
          cost_per_trip: number
          total_cost: number
          created_at: string
        }
        Insert: {
          id?: string
          order_id: string
          vehicle_type: string
          trip_count: number
          cost_per_trip: number
          created_at?: string
        }
        Update: {
          id?: string
          order_id?: string
          vehicle_type?: string
          trip_count?: number
          cost_per_trip?: number
          created_at?: string
        }
      }
      inventory_transactions: {
        Row: {
          id: string
          product_id: string
          transaction_type: string
          quantity: number
          order_id: string | null
          notes: string
          created_at: string
        }
        Insert: {
          id?: string
          product_id: string
          transaction_type: string
          quantity: number
          order_id?: string | null
          notes?: string
          created_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          transaction_type?: string
          quantity?: number
          order_id?: string | null
          notes?: string
          created_at?: string
        }
      }
    }
  }
}
