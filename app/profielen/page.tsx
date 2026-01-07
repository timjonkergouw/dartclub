"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

interface Profile {
  id: number;
  username: string;
  created_at?: string;
}

export default function Profielen() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchProfiles = async () => {
    // Only execute on client side
    if (typeof window === "undefined") return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching profiles:", error);
        alert("Fout bij ophalen profielen: " + error.message);
        return;
      }
      setProfiles(data || []);
    } catch (error) {
      console.error("Error fetching profiles:", error);
      if (error instanceof Error) {
        alert("Fout bij ophalen profielen: " + error.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfiles();
  }, []);

  const handleAdd = () => {
    setModalMode("add");
    setEditingProfile(null);
    setName("");
    setIsModalOpen(true);
  };

  const handleEdit = (profile: Profile) => {
    setModalMode("edit");
    setEditingProfile(profile);
    setName(profile.username);
    setIsModalOpen(true);
  };

  const handleDelete = async (profileId: number) => {
    if (!confirm("Weet je zeker dat je dit profiel wilt verwijderen?")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("profiles")
        .delete()
        .eq("id", profileId);

      if (error) {
        console.error("Error deleting profile:", error);
        alert("Fout bij verwijderen profiel: " + error.message);
        return;
      }

      // Refresh profiles list
      fetchProfiles();
    } catch (error) {
      console.error("Error deleting profile:", error);
      if (error instanceof Error) {
        alert("Fout bij verwijderen profiel: " + error.message);
      }
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      alert("Voer een naam in");
      return;
    }

    setIsSubmitting(true);
    try {
      if (modalMode === "add") {
        // Check for duplicate username
        const { data: existingProfiles } = await supabase
          .from("profiles")
          .select("id")
          .eq("username", name.trim())
          .single();

        if (existingProfiles) {
          alert("Deze gebruikersnaam bestaat al. Kies een andere naam.");
          setIsSubmitting(false);
          return;
        }

        const { error } = await supabase
          .from("profiles")
          .insert({ username: name.trim() })
          .select();

        if (error) {
          console.error("Error creating profile:", error);
          let errorMessage = error.message || "Onbekende fout";
          if (error.code === "23505" || error.message?.includes("duplicate key")) {
            errorMessage = "Deze gebruikersnaam bestaat al. Kies een andere naam.";
          }
          alert("Fout bij aanmaken profiel: " + errorMessage);
          setIsSubmitting(false);
          return;
        }
      } else {
        // Edit mode
        if (!editingProfile) return;

        // Check for duplicate username (excluding current profile)
        const { data: existingProfiles } = await supabase
          .from("profiles")
          .select("id")
          .eq("username", name.trim())
          .neq("id", editingProfile.id)
          .single();

        if (existingProfiles) {
          alert("Deze gebruikersnaam bestaat al. Kies een andere naam.");
          setIsSubmitting(false);
          return;
        }

        const { error } = await supabase
          .from("profiles")
          .update({ username: name.trim() })
          .eq("id", editingProfile.id);

        if (error) {
          console.error("Error updating profile:", error);
          let errorMessage = error.message || "Onbekende fout";
          if (error.code === "23505" || error.message?.includes("duplicate key")) {
            errorMessage = "Deze gebruikersnaam bestaat al. Kies een andere naam.";
          }
          alert("Fout bij bijwerken profiel: " + errorMessage);
          setIsSubmitting(false);
          return;
        }
      }

      // Success - close modal and refresh
      setIsModalOpen(false);
      setName("");
      setEditingProfile(null);
      fetchProfiles();
    } catch (error) {
      console.error("Error saving profile:", error);
      if (error instanceof Error) {
        alert("Fout bij opslaan profiel: " + error.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setIsModalOpen(false);
    setName("");
    setEditingProfile(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0A294F] to-[#1a3d6b] flex flex-col relative">
      {/* Terug pijltje linksboven */}
      <div className="absolute top-4 left-4 z-50">
        <Link href="/">
          <button className="w-10 h-10 flex items-center justify-center bg-[#0A294F] text-white rounded-full hover:bg-[#0d3a6a] active:scale-95 transition-all duration-150 touch-manipulation">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M15 18L9 12L15 6"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </Link>
      </div>

      {/* Logo rechtsboven */}
      <div className="absolute top-4 right-4 z-50">
        <Link href="/">
          <Image
            src="/logo wit dartclub.png"
            alt="DartClub Logo"
            width={60}
            height={60}
            className="object-contain"
          />
        </Link>
      </div>

      {/* Main Content */}
      <div className="flex-1 px-4 pb-6 pt-16">
        <div className="max-w-md mx-auto w-full">
          {/* Title */}
          <h1 className="text-white text-2xl font-semibold mb-6 text-center">
            Profielen
          </h1>

          {/* Add Button */}
          <button
            onClick={handleAdd}
            className="w-full bg-[#28C7D8] text-white py-4 px-4 rounded-2xl shadow-md active:scale-95 transition-all duration-150 hover:bg-[#22a8b7] touch-manipulation font-semibold text-lg mb-6"
            style={{ minHeight: "64px" }}
          >
            Nieuw profiel toevoegen
          </button>

          {/* Profiles List */}
          {isLoading ? (
            <div className="text-white text-center py-8">
              Laden...
            </div>
          ) : profiles.length === 0 ? (
            <div className="text-white text-center py-8">
              <p className="text-lg mb-2">Geen profielen gevonden</p>
              <p className="text-sm" style={{ color: "#7E838F" }}>
                Voeg je eerste profiel toe om te beginnen
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {profiles.map((profile) => (
                <div
                  key={profile.id}
                  className="bg-[#E8F0FF] text-[#000000] py-4 px-4 rounded-2xl shadow-md flex items-center justify-between gap-3"
                  style={{ minHeight: "64px" }}
                >
                  <span className="font-semibold text-lg flex-1">
                    {profile.username}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(profile)}
                      className="bg-[#0A294F] text-white py-2 px-4 rounded-lg font-semibold text-sm hover:bg-[#0d3a6a] active:scale-95 transition-all duration-150 touch-manipulation"
                      style={{ minHeight: "44px" }}
                    >
                      Bewerken
                    </button>
                    <button
                      onClick={() => handleDelete(profile.id)}
                      className="bg-[#dc2626] text-white py-2 px-4 rounded-lg font-semibold text-sm hover:bg-[#b91c1c] active:scale-95 transition-all duration-150 touch-manipulation"
                      style={{ minHeight: "44px" }}
                    >
                      Verwijderen
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal for Add/Edit */}
      {isModalOpen && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-[#0A294F] bg-opacity-60 backdrop-blur-sm z-40 transition-opacity duration-300"
            onClick={handleCancel}
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="bg-[#E8F0FF] rounded-2xl p-6 shadow-2xl w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center mb-6">
                <h2 className="text-[#000000] font-semibold text-xl mb-2">
                  {modalMode === "add" ? "Nieuw profiel toevoegen" : "Profiel bewerken"}
                </h2>
                <p className="text-[#7E838F] text-sm">
                  {modalMode === "add"
                    ? "Voer een naam in voor het nieuwe profiel"
                    : "Wijzig de naam van het profiel"}
                </p>
              </div>

              <div className="mb-6">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Naam"
                  className="w-full py-3 px-4 rounded-xl border-2 border-[#0A294F] text-[#000000] font-semibold text-lg focus:outline-none focus:ring-2 focus:ring-[#28C7D8] focus:border-transparent"
                  style={{ minHeight: "56px" }}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSubmit();
                    } else if (e.key === "Escape") {
                      handleCancel();
                    }
                  }}
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleCancel}
                  disabled={isSubmitting}
                  className="flex-1 py-4 px-6 bg-white text-[#000000] rounded-xl font-semibold text-lg hover:bg-[#D0E0FF] active:scale-95 transition-all duration-150 touch-manipulation border-2 border-[#0A294F] disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ minHeight: "56px" }}
                >
                  Annuleren
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting || !name.trim()}
                  className="flex-1 py-4 px-6 bg-[#28C7D8] text-white rounded-xl font-semibold text-lg hover:bg-[#22a8b7] active:scale-95 transition-all duration-150 touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ minHeight: "56px" }}
                >
                  {isSubmitting ? "Bezig..." : modalMode === "add" ? "Toevoegen" : "Opslaan"}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

