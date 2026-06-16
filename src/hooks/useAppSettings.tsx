import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface AppSettings {
  ramadan_theme_enabled: boolean;
  new_departments_label_enabled: boolean;
  new_departments_label: string;
}

const defaultSettings: AppSettings = {
  ramadan_theme_enabled: false,
  new_departments_label_enabled: true,
  new_departments_label: "New Departments",
};

export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("app_settings" as any)
        .select("key, value");

      if (error) {
        console.error("Error fetching app settings:", error);
        return;
      }

      const parsed: AppSettings = { ...defaultSettings };
      (data as any[])?.forEach((row: { key: string; value: string }) => {
        if (row.key === "ramadan_theme_enabled") {
          parsed.ramadan_theme_enabled = row.value === "true";
        }
        if (row.key === "new_departments_label_enabled") {
          parsed.new_departments_label_enabled = row.value !== "false";
        }
        if (row.key === "new_departments_label") {
          parsed.new_departments_label = row.value || defaultSettings.new_departments_label;
        }
      });

      setSettings(parsed);
    } catch (err) {
      console.error("Error fetching app settings:", err);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key: string, value: string) => {
    try {
      const { error } = await supabase
        .from("app_settings" as any)
        .upsert({ key, value } as any, { onConflict: "key" });

      if (error) throw error;

      // Update local state
      if (key === "ramadan_theme_enabled") {
        setSettings((prev) => ({
          ...prev,
          ramadan_theme_enabled: value === "true",
        }));
      }
      if (key === "new_departments_label_enabled") {
        setSettings((prev) => ({
          ...prev,
          new_departments_label_enabled: value !== "false",
        }));
      }
      if (key === "new_departments_label") {
        setSettings((prev) => ({
          ...prev,
          new_departments_label: value || defaultSettings.new_departments_label,
        }));
      }

      return true;
    } catch (err) {
      console.error("Error updating app setting:", err);
      return false;
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return { settings, loading, updateSetting, refresh: fetchSettings };
}
