export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      clients: {
        Row: {
          dateAdded: string | null
          email: string | null
          id: string
          name: string
          phone: string | null
          type: string | null
        }
        Insert: {
          dateAdded?: string | null
          email?: string | null
          id: string
          name: string
          phone?: string | null
          type?: string | null
        }
        Update: {
          dateAdded?: string | null
          email?: string | null
          id?: string
          name?: string
          phone?: string | null
          type?: string | null
        }
        Relationships: []
      }
      court_cases: {
        Row: {
          archived: boolean | null
          balance: number | null
          billed: number | null
          categories: Json | null
          clientId: string | null
          completedDate: string | null
          deadlines: Json | null
          details: string | null
          documents: Json | null
          fileName: string | null
          id: string
          last_client_feedback_date: string | null
          lastClientFeedbackDate: string | null
          lawyerId: string | null
          nextCourtDate: string | null
          paid: number | null
          progressNotes: Json | null
          scannedInvoiceUrl: string | null
          sittingType: string | null
          status: string | null
          title: string | null
        }
        Insert: {
          archived?: boolean | null
          balance?: number | null
          billed?: number | null
          categories?: Json | null
          clientId?: string | null
          completedDate?: string | null
          deadlines?: Json | null
          details?: string | null
          documents?: Json | null
          fileName?: string | null
          id: string
          last_client_feedback_date?: string | null
          lastClientFeedbackDate?: string | null
          lawyerId?: string | null
          nextCourtDate?: string | null
          paid?: number | null
          progressNotes?: Json | null
          scannedInvoiceUrl?: string | null
          sittingType?: string | null
          status?: string | null
          title?: string | null
        }
        Update: {
          archived?: boolean | null
          balance?: number | null
          billed?: number | null
          categories?: Json | null
          clientId?: string | null
          completedDate?: string | null
          deadlines?: Json | null
          details?: string | null
          documents?: Json | null
          fileName?: string | null
          id?: string
          last_client_feedback_date?: string | null
          lastClientFeedbackDate?: string | null
          lawyerId?: string | null
          nextCourtDate?: string | null
          paid?: number | null
          progressNotes?: Json | null
          scannedInvoiceUrl?: string | null
          sittingType?: string | null
          status?: string | null
          title?: string | null
        }
        Relationships: []
      }
      draft_requests: {
        Row: {
          assignedToId: string | null
          assignedToName: string | null
          caseFileName: string | null
          caseId: string | null
          completionNote: string | null
          dateCompleted: string | null
          dateCreated: string | null
          deadline: string | null
          description: string | null
          documentName: string | null
          documentUrl: string | null
          hoursSpent: number | null
          id: string
          requestedById: string | null
          requestedByName: string | null
          status: string | null
          title: string | null
        }
        Insert: {
          assignedToId?: string | null
          assignedToName?: string | null
          caseFileName?: string | null
          caseId?: string | null
          completionNote?: string | null
          dateCompleted?: string | null
          dateCreated?: string | null
          deadline?: string | null
          description?: string | null
          documentName?: string | null
          documentUrl?: string | null
          hoursSpent?: number | null
          id: string
          requestedById?: string | null
          requestedByName?: string | null
          status?: string | null
          title?: string | null
        }
        Update: {
          assignedToId?: string | null
          assignedToName?: string | null
          caseFileName?: string | null
          caseId?: string | null
          completionNote?: string | null
          dateCompleted?: string | null
          dateCreated?: string | null
          deadline?: string | null
          description?: string | null
          documentName?: string | null
          documentUrl?: string | null
          hoursSpent?: number | null
          id?: string
          requestedById?: string | null
          requestedByName?: string | null
          status?: string | null
          title?: string | null
        }
        Relationships: []
      }
      expenses: {
        Row: {
          addedById: string | null
          addedByName: string | null
          amount: number | null
          category: string | null
          date: string | null
          description: string | null
          id: string
          purpose: string | null
          relatedFileId: string | null
          relatedFileName: string | null
          relatedFileType: string | null
          staffId: string | null
          staffName: string | null
          type: string | null
        }
        Insert: {
          addedById?: string | null
          addedByName?: string | null
          amount?: number | null
          category?: string | null
          date?: string | null
          description?: string | null
          id: string
          purpose?: string | null
          relatedFileId?: string | null
          relatedFileName?: string | null
          relatedFileType?: string | null
          staffId?: string | null
          staffName?: string | null
          type?: string | null
        }
        Update: {
          addedById?: string | null
          addedByName?: string | null
          amount?: number | null
          category?: string | null
          date?: string | null
          description?: string | null
          id?: string
          purpose?: string | null
          relatedFileId?: string | null
          relatedFileName?: string | null
          relatedFileType?: string | null
          staffId?: string | null
          staffName?: string | null
          type?: string | null
        }
        Relationships: []
      }
      filing_requests: {
        Row: {
          assignedToId: string | null
          assignedToName: string | null
          caseFileName: string | null
          caseId: string | null
          dateCompleted: string | null
          dateCreated: string | null
          description: string | null
          documentName: string | null
          eccmisReference: string | null
          hoursSpent: number | null
          id: string
          registryNote: string | null
          requestedById: string | null
          requestedByName: string | null
          status: string | null
          title: string | null
        }
        Insert: {
          assignedToId?: string | null
          assignedToName?: string | null
          caseFileName?: string | null
          caseId?: string | null
          dateCompleted?: string | null
          dateCreated?: string | null
          description?: string | null
          documentName?: string | null
          eccmisReference?: string | null
          hoursSpent?: number | null
          id: string
          registryNote?: string | null
          requestedById?: string | null
          requestedByName?: string | null
          status?: string | null
          title?: string | null
        }
        Update: {
          assignedToId?: string | null
          assignedToName?: string | null
          caseFileName?: string | null
          caseId?: string | null
          dateCompleted?: string | null
          dateCreated?: string | null
          description?: string | null
          documentName?: string | null
          eccmisReference?: string | null
          hoursSpent?: number | null
          id?: string
          registryNote?: string | null
          requestedById?: string | null
          requestedByName?: string | null
          status?: string | null
          title?: string | null
        }
        Relationships: []
      }
      invoices: {
        Row: {
          amountbilled: number | null
          amountpaid: number | null
          balance: number | null
          datecreated: string | null
          duedate: string | null
          filename: string | null
          id: string
          ispaid: boolean | null
          relatedfile: string | null
          scannedInvoiceUrl: string | null
        }
        Insert: {
          amountbilled?: number | null
          amountpaid?: number | null
          balance?: number | null
          datecreated?: string | null
          duedate?: string | null
          filename?: string | null
          id: string
          ispaid?: boolean | null
          relatedfile?: string | null
          scannedInvoiceUrl?: string | null
        }
        Update: {
          amountbilled?: number | null
          amountpaid?: number | null
          balance?: number | null
          datecreated?: string | null
          duedate?: string | null
          filename?: string | null
          id?: string
          ispaid?: boolean | null
          relatedfile?: string | null
          scannedInvoiceUrl?: string | null
        }
        Relationships: []
      }
      land_title_notes: {
        Row: {
          author_id: string | null
          author_name: string | null
          created_at: string | null
          id: string
          message: string | null
          title_id: string
        }
        Insert: {
          author_id?: string | null
          author_name?: string | null
          created_at?: string | null
          id: string
          message?: string | null
          title_id: string
        }
        Update: {
          author_id?: string | null
          author_name?: string | null
          created_at?: string | null
          id?: string
          message?: string | null
          title_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "land_title_notes_title_id_fkey"
            columns: ["title_id"]
            isOneToOne: false
            referencedRelation: "land_titles"
            referencedColumns: ["id"]
          },
        ]
      }
      land_titles: {
        Row: {
          block: string | null
          client_id: string | null
          county: string | null
          created_at: string | null
          date_received: string | null
          date_released: string | null
          district: string | null
          handling_lawyer_id: string | null
          id: string
          location: string | null
          monthly_rate: number | null
          notes: string | null
          origin: string | null
          owner_name: string
          plot_block: string | null
          scanned_copy_name: string | null
          scanned_copy_url: string | null
          size: string | null
          status: string | null
          storage_location: string | null
          taken_at: string | null
          taken_by: string | null
          taken_reason: string | null
          title_number: string
          title_type: string | null
          total_billed: number | null
          total_paid: number | null
          transaction_id: string | null
          updated_at: string | null
        }
        Insert: {
          block?: string | null
          client_id?: string | null
          county?: string | null
          created_at?: string | null
          date_received?: string | null
          date_released?: string | null
          district?: string | null
          handling_lawyer_id?: string | null
          id: string
          location?: string | null
          monthly_rate?: number | null
          notes?: string | null
          origin?: string | null
          owner_name: string
          plot_block?: string | null
          scanned_copy_name?: string | null
          scanned_copy_url?: string | null
          size?: string | null
          status?: string | null
          storage_location?: string | null
          taken_at?: string | null
          taken_by?: string | null
          taken_reason?: string | null
          title_number: string
          title_type?: string | null
          total_billed?: number | null
          total_paid?: number | null
          transaction_id?: string | null
          updated_at?: string | null
        }
        Update: {
          block?: string | null
          client_id?: string | null
          county?: string | null
          created_at?: string | null
          date_received?: string | null
          date_released?: string | null
          district?: string | null
          handling_lawyer_id?: string | null
          id?: string
          location?: string | null
          monthly_rate?: number | null
          notes?: string | null
          origin?: string | null
          owner_name?: string
          plot_block?: string | null
          scanned_copy_name?: string | null
          scanned_copy_url?: string | null
          size?: string | null
          status?: string | null
          storage_location?: string | null
          taken_at?: string | null
          taken_by?: string | null
          taken_reason?: string | null
          title_number?: string
          title_type?: string | null
          total_billed?: number | null
          total_paid?: number | null
          transaction_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      letters: {
        Row: {
          archived: boolean | null
          billed: number | null
          clientId: string | null
          date: string | null
          documents: Json | null
          fileName: string | null
          id: string
          lastClientFeedbackDate: string | null
          lawyerId: string | null
          paid: number | null
          progressNotes: Json | null
          recipient: string | null
          scannedInvoiceUrl: string | null
          status: string | null
          subject: string | null
          type: string | null
        }
        Insert: {
          archived?: boolean | null
          billed?: number | null
          clientId?: string | null
          date?: string | null
          documents?: Json | null
          fileName?: string | null
          id: string
          lastClientFeedbackDate?: string | null
          lawyerId?: string | null
          paid?: number | null
          progressNotes?: Json | null
          recipient?: string | null
          scannedInvoiceUrl?: string | null
          status?: string | null
          subject?: string | null
          type?: string | null
        }
        Update: {
          archived?: boolean | null
          billed?: number | null
          clientId?: string | null
          date?: string | null
          documents?: Json | null
          fileName?: string | null
          id?: string
          lastClientFeedbackDate?: string | null
          lawyerId?: string | null
          paid?: number | null
          progressNotes?: Json | null
          recipient?: string | null
          scannedInvoiceUrl?: string | null
          status?: string | null
          subject?: string | null
          type?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          date: string
          id: string
          message: string
          read: boolean | null
          recipientid: string
          relatedid: string | null
          relatedtype: string | null
          type: string
        }
        Insert: {
          date: string
          id: string
          message: string
          read?: boolean | null
          recipientid: string
          relatedid?: string | null
          relatedtype?: string | null
          type: string
        }
        Update: {
          date?: string
          id?: string
          message?: string
          read?: boolean | null
          recipientid?: string
          relatedid?: string | null
          relatedtype?: string | null
          type?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          subscription: string | null
          updatedAt: string | null
          userId: string
        }
        Insert: {
          subscription?: string | null
          updatedAt?: string | null
          userId: string
        }
        Update: {
          subscription?: string | null
          updatedAt?: string | null
          userId?: string
        }
        Relationships: []
      }
      requisitions: {
        Row: {
          amount: number
          approvedById: string | null
          approvedByName: string | null
          category: string | null
          dateApproved: string | null
          datePaid: string | null
          dateSubmitted: string | null
          id: string
          notes: string | null
          paidById: string | null
          paidByName: string | null
          rejectionReason: string | null
          relatedFileId: string | null
          relatedFileName: string | null
          relatedFileType: string | null
          status: string | null
          submittedById: string | null
          submittedByName: string | null
          title: string
        }
        Insert: {
          amount?: number
          approvedById?: string | null
          approvedByName?: string | null
          category?: string | null
          dateApproved?: string | null
          datePaid?: string | null
          dateSubmitted?: string | null
          id: string
          notes?: string | null
          paidById?: string | null
          paidByName?: string | null
          rejectionReason?: string | null
          relatedFileId?: string | null
          relatedFileName?: string | null
          relatedFileType?: string | null
          status?: string | null
          submittedById?: string | null
          submittedByName?: string | null
          title: string
        }
        Update: {
          amount?: number
          approvedById?: string | null
          approvedByName?: string | null
          category?: string | null
          dateApproved?: string | null
          datePaid?: string | null
          dateSubmitted?: string | null
          id?: string
          notes?: string | null
          paidById?: string | null
          paidByName?: string | null
          rejectionReason?: string | null
          relatedFileId?: string | null
          relatedFileName?: string | null
          relatedFileType?: string | null
          status?: string | null
          submittedById?: string | null
          submittedByName?: string | null
          title?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assignedById: string | null
          assignedByName: string | null
          assignedToId: string | null
          assignedToName: string | null
          clerkNote: string | null
          dateCreated: string | null
          deleted: boolean | null
          description: string | null
          dueDate: string | null
          id: string
          priority: string | null
          progressNotes: Json | null
          relatedFileId: string | null
          relatedFileName: string | null
          relatedFileType: string | null
          status: string | null
          title: string
        }
        Insert: {
          assignedById?: string | null
          assignedByName?: string | null
          assignedToId?: string | null
          assignedToName?: string | null
          clerkNote?: string | null
          dateCreated?: string | null
          deleted?: boolean | null
          description?: string | null
          dueDate?: string | null
          id: string
          priority?: string | null
          progressNotes?: Json | null
          relatedFileId?: string | null
          relatedFileName?: string | null
          relatedFileType?: string | null
          status?: string | null
          title: string
        }
        Update: {
          assignedById?: string | null
          assignedByName?: string | null
          assignedToId?: string | null
          assignedToName?: string | null
          clerkNote?: string | null
          dateCreated?: string | null
          deleted?: boolean | null
          description?: string | null
          dueDate?: string | null
          id?: string
          priority?: string | null
          progressNotes?: Json | null
          relatedFileId?: string | null
          relatedFileName?: string | null
          relatedFileType?: string | null
          status?: string | null
          title?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          archived: boolean | null
          balance: number | null
          billedAmount: number | null
          clientId: string | null
          date: string | null
          documents: Json | null
          fileName: string | null
          id: string
          last_client_feedback_date: string | null
          lastClientFeedbackDate: string | null
          lawyerId: string | null
          paidAmount: number | null
          progressNotes: Json | null
          scannedInvoiceUrl: string | null
          type: string | null
        }
        Insert: {
          archived?: boolean | null
          balance?: number | null
          billedAmount?: number | null
          clientId?: string | null
          date?: string | null
          documents?: Json | null
          fileName?: string | null
          id: string
          last_client_feedback_date?: string | null
          lastClientFeedbackDate?: string | null
          lawyerId?: string | null
          paidAmount?: number | null
          progressNotes?: Json | null
          scannedInvoiceUrl?: string | null
          type?: string | null
        }
        Update: {
          archived?: boolean | null
          balance?: number | null
          billedAmount?: number | null
          clientId?: string | null
          date?: string | null
          documents?: Json | null
          fileName?: string | null
          id?: string
          last_client_feedback_date?: string | null
          lastClientFeedbackDate?: string | null
          lawyerId?: string | null
          paidAmount?: number | null
          progressNotes?: Json | null
          scannedInvoiceUrl?: string | null
          type?: string | null
        }
        Relationships: []
      }
      users: {
        Row: {
          created_at: string | null
          email: string
          id: string
          name: string
          password: string
          role: string
          telegramid: string | null
          telegramId: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id: string
          name: string
          password: string
          role: string
          telegramid?: string | null
          telegramId?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          name?: string
          password?: string
          role?: string
          telegramid?: string | null
          telegramId?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
