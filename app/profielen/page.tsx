"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

interface Profile {
  id: number;
  username: string;
  avatar_url?: string | null;
  created_at?: string;
}

export default function Profielen() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"add" | "edit">("add");
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [name, setName] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarRemoved, setAvatarRemoved] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [alertMessage, setAlertMessage] = useState<{ message: string; type: "error" | "success" | "info" } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ message: string; onConfirm: () => void; onCancel?: () => void } | null>(null);

  const fetchProfiles = async () => {
    // Only execute on client side
    if (typeof window === "undefined") return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("username", { ascending: true });

      if (error) {
        console.error("Error fetching profiles:", error);
        setAlertMessage({ message: "Fout bij ophalen profielen: " + error.message, type: "error" });
        return;
      }
      setProfiles(data || []);
    } catch (error) {
      console.error("Error fetching profiles:", error);
      if (error instanceof Error) {
        setAlertMessage({ message: "Fout bij ophalen profielen: " + error.message, type: "error" });
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
    setAvatarFile(null);
    setAvatarPreview(null);
    setAvatarRemoved(false);
    setIsModalOpen(true);
  };

  const handleEdit = (profile: Profile) => {
    setModalMode("edit");
    setEditingProfile(profile);
    setName(profile.username);
    setAvatarFile(null);
    setAvatarPreview(profile.avatar_url || null);
    setAvatarRemoved(false);
    setIsModalOpen(true);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setAlertMessage({ message: "Alleen afbeeldingen zijn toegestaan.", type: "error" });
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setAlertMessage({ message: "Afbeelding mag maximaal 5MB zijn.", type: "error" });
        return;
      }
      setAvatarFile(file);
      setAvatarRemoved(false); // Reset removed flag als er een nieuwe foto wordt gekozen
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveAvatar = () => {
    setConfirmDialog({
      message: "Weet je zeker dat je de profielfoto wilt verwijderen?",
      onConfirm: () => {
        // Reset preview en file
        setAvatarFile(null);
        setAvatarPreview(null);
        setAvatarRemoved(true); // Markeer dat de foto is verwijderd
        setConfirmDialog(null);
      },
      onCancel: () => {
        setConfirmDialog(null);
      }
    });
  };

  const handleDelete = async (profileId: number) => {
    setConfirmDialog({
      message: "Weet je zeker dat je dit profiel wilt verwijderen? Alle bijbehorende games en statistieken worden ook verwijderd.",
      onConfirm: async () => {
        setConfirmDialog(null);
        try {

          // Eerst halen we alle games op die bij dit profiel horen
          const { data: gamesData, error: gamesFetchError } = await supabase
            .from("games")
            .select("id")
            .eq("profile_id", profileId);

          if (gamesFetchError) {
            console.error("Error fetching games:", gamesFetchError);
            setAlertMessage({ message: "Fout bij ophalen games: " + gamesFetchError.message, type: "error" });
            return;
          }

          const gameIds = gamesData?.map(game => game.id) || [];
          console.log(`Found ${gameIds.length} games for profile:`, profileId);

          // 1. Verwijder eerst alle dart_stats records die verwijzen naar deze games (via game_id)
          if (gameIds.length > 0) {
            const { error: statsError, data: statsData } = await supabase
              .from("dart_stats")
              .delete()
              .in("game_id", gameIds)
              .select();

            if (statsError) {
              console.error("Error deleting dart_stats by game_id:", {
                error: statsError,
                message: statsError.message,
                details: statsError.details,
                hint: statsError.hint,
                code: statsError.code,
              });
              // Als het een permission error is, stop dan
              if (statsError.code === "PGRST301" || statsError.message?.includes("permission denied")) {
                setAlertMessage({ message: "Geen toestemming om statistieken te verwijderen. Controleer de database policies voor dart_stats.", type: "error" });
                return;
              }
            } else {
            }
          }

          // 2. Verwijder ook alle dart_stats records die direct naar dit profiel verwijzen (via player_id)
          const { error: statsByPlayerError, data: statsByPlayerData } = await supabase
            .from("dart_stats")
            .delete()
            .eq("player_id", profileId)
            .select();

          if (statsByPlayerError) {
            console.error("Error deleting dart_stats by player_id:", {
              error: statsByPlayerError,
              message: statsByPlayerError.message,
              details: statsByPlayerError.details,
              hint: statsByPlayerError.hint,
              code: statsByPlayerError.code,
            });
            // Als het een permission error is, stop dan
            if (statsByPlayerError.code === "PGRST301" || statsByPlayerError.message?.includes("permission denied")) {
              setAlertMessage({ message: "Geen toestemming om statistieken te verwijderen. Controleer de database policies voor dart_stats.", type: "error" });
              return;
            }
          } else {
            console.log(`Deleted ${statsByPlayerData?.length || 0} dart_stats records by player_id:`, profileId);
          }

          // 3. Nu kunnen we de games verwijderen (alle dart_stats zijn al verwijderd)
          if (gameIds.length > 0) {
            const { error: gamesError, data: deletedGamesData } = await supabase
              .from("games")
              .delete()
              .eq("profile_id", profileId)
              .select();

            if (gamesError) {
              console.error("Error deleting games:", {
                error: gamesError,
                message: gamesError.message,
                details: gamesError.details,
                hint: gamesError.hint,
                code: gamesError.code,
              });
              // Als het een permission error is, stop dan
              if (gamesError.code === "PGRST301" || gamesError.message?.includes("permission denied")) {
                setAlertMessage({ message: "Geen toestemming om games te verwijderen. Controleer de database policies voor games.", type: "error" });
                return;
              }
            } else {
            }
          }

          // 4. Nu verwijderen we het profiel zelf
          const { data, error } = await supabase
            .from("profiles")
            .delete()
            .eq("id", profileId)
            .select();

          if (error) {
            // Log volledige error details
            const errorDetails = {
              error: error,
              message: error.message,
              details: error.details,
              hint: error.hint,
              code: error.code,
              // Probeer ook de error object zelf te stringify
              errorString: JSON.stringify(error, Object.getOwnPropertyNames(error)),
            };
            console.error("Error deleting profile:", errorDetails);

            let errorMessage = error.message || "Onbekende fout";

            // Check voor specifieke error codes
            if (error.code === "PGRST301" || error.message?.includes("permission denied") || error.message?.includes("permission")) {
              errorMessage = "Geen toestemming om profiel te verwijderen. Controleer de database policies voor de profiles tabel.";
            } else if (error.code === "23503" || error.message?.includes("foreign key") || error.message?.includes("constraint")) {
              errorMessage = "Dit profiel kan niet worden verwijderd omdat het nog wordt gebruikt in games of statistieken.";
            } else if (error.code === "PGRST116") {
              errorMessage = "Profiel niet gevonden.";
            } else if (error.code === "23505") {
              errorMessage = "Er is een conflict opgetreden bij het verwijderen.";
            } else if (!error.message) {
              // Als er geen message is, probeer details of hint
              errorMessage = error.details || error.hint || `Error code: ${error.code || "unknown"}`;
            }

            setAlertMessage({ message: "Fout bij verwijderen profiel: " + errorMessage + "\n\nCheck de console voor meer details.", type: "error" });
            return;
          }


          setAlertMessage({ message: "Profiel succesvol verwijderd!", type: "success" });

          // Refresh profiles list
          fetchProfiles();

          // Auto-close success message after 2 seconds
          setTimeout(() => {
            setAlertMessage(null);
          }, 2000);
        } catch (error) {
          console.error("Error deleting profile (catch block):", error);
          let errorMessage = "Onbekende fout";
          if (error instanceof Error) {
            errorMessage = error.message;
          } else if (typeof error === "object" && error !== null) {
            errorMessage = JSON.stringify(error);
          }
          setAlertMessage({ message: "Fout bij verwijderen profiel: " + errorMessage, type: "error" });
        }
      },
      onCancel: () => {
        setConfirmDialog(null);
      }
    });
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      setAlertMessage({ message: "Voer een naam in", type: "error" });
      return;
    }

    setIsSubmitting(true);
    try {
      let avatarUrl: string | null = null;

      // Upload avatar if a new file was selected
      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `avatars/${fileName}`;

        // Upload to Supabase Storage
        const { error: uploadError, data: uploadData } = await supabase.storage
          .from('profiles')
          .upload(filePath, avatarFile, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error("Error uploading avatar:", uploadError);
          setAlertMessage({ message: "Fout bij uploaden profielfoto: " + uploadError.message, type: "error" });
          setIsSubmitting(false);
          return;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('profiles')
          .getPublicUrl(filePath);

        avatarUrl = urlData.publicUrl;

        // If editing and there was an old avatar, delete it
        if (modalMode === "edit" && editingProfile?.avatar_url) {
          const oldPath = editingProfile.avatar_url.split('/').slice(-2).join('/');
          await supabase.storage
            .from('profiles')
            .remove([oldPath]);
        }
      } else if (avatarRemoved) {
        // Foto is verwijderd - zet op null
        avatarUrl = null;

        // Verwijder oude foto uit Storage als die bestaat
        if (modalMode === "edit" && editingProfile?.avatar_url) {
          try {
            const oldPath = editingProfile.avatar_url.split('/').slice(-2).join('/');
            const { error: deleteError } = await supabase.storage
              .from('profiles')
              .remove([oldPath]);

            if (deleteError) {
              console.error("Error deleting old avatar:", deleteError);
              // Ga door, we kunnen nog steeds de database updaten
            }
          } catch (error) {
            console.error("Error deleting avatar:", error);
          }
        }
      } else if (modalMode === "edit" && editingProfile) {
        // Keep existing avatar if no new file was selected and not removed
        avatarUrl = editingProfile.avatar_url || null;
      }

      if (modalMode === "add") {
        // Check for duplicate username
        const { data: existingProfiles } = await supabase
          .from("profiles")
          .select("id")
          .eq("username", name.trim())
          .single();

        if (existingProfiles) {
          setAlertMessage({ message: "Deze gebruikersnaam bestaat al. Kies een andere naam.", type: "error" });
          setIsSubmitting(false);
          return;
        }

        const { error } = await supabase
          .from("profiles")
          .insert({
            username: name.trim(),
            avatar_url: avatarUrl
          })
          .select();

        if (error) {
          console.error("Error creating profile:", error);
          let errorMessage = error.message || "Onbekende fout";
          if (error.code === "23505" || error.message?.includes("duplicate key")) {
            errorMessage = "Deze gebruikersnaam bestaat al. Kies een andere naam.";
          }
          setAlertMessage({ message: "Fout bij aanmaken profiel: " + errorMessage, type: "error" });
          setIsSubmitting(false);
          return;
        }

        setAlertMessage({ message: "Profiel succesvol aangemaakt!", type: "success" });

        // Auto-close modal and success message after 1.5 seconds
        setTimeout(() => {
          setIsModalOpen(false);
          setAlertMessage(null);
        }, 1500);
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
          setAlertMessage({ message: "Deze gebruikersnaam bestaat al. Kies een andere naam.", type: "error" });
          setIsSubmitting(false);
          return;
        }

        const { error } = await supabase
          .from("profiles")
          .update({
            username: name.trim(),
            avatar_url: avatarUrl
          })
          .eq("id", editingProfile.id);

        if (error) {
          console.error("Error updating profile:", error);
          let errorMessage = error.message || "Onbekende fout";
          if (error.code === "23505" || error.message?.includes("duplicate key")) {
            errorMessage = "Deze gebruikersnaam bestaat al. Kies een andere naam.";
          }
          setAlertMessage({ message: "Fout bij bijwerken profiel: " + errorMessage, type: "error" });
          setIsSubmitting(false);
          return;
        }

        setAlertMessage({ message: "Profiel succesvol bijgewerkt!", type: "success" });

        // Auto-close modal and success message after 1.5 seconds
        setTimeout(() => {
          setIsModalOpen(false);
          setAlertMessage(null);
        }, 1500);
      }

      // Success - refresh (modal closes automatically)
      setName("");
      setAvatarFile(null);
      setAvatarPreview(null);
      setAvatarRemoved(false);
      setEditingProfile(null);
      fetchProfiles();
    } catch (error) {
      console.error("Error saving profile:", error);
      if (error instanceof Error) {
        setAlertMessage({ message: "Fout bij opslaan profiel: " + error.message, type: "error" });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setIsModalOpen(false);
    setName("");
    setAvatarFile(null);
    setAvatarPreview(null);
    setAvatarRemoved(false);
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
                  <div className="flex items-center gap-3 flex-1">
                    {profile.avatar_url ? (
                      <Image
                        src={profile.avatar_url}
                        alt={profile.username}
                        width={48}
                        height={48}
                        className="rounded-full object-cover"
                        style={{ width: "48px", height: "48px" }}
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-[#0A294F] flex items-center justify-center text-white font-semibold text-lg">
                        {profile.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="font-semibold text-lg">
                      {profile.username}
                    </span>
                  </div>
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

              <div className="mb-6 space-y-4">
                {/* Avatar Upload */}
                <div className="flex flex-col items-center">
                  <div className="relative mb-4">
                    {avatarPreview ? (
                      <Image
                        src={avatarPreview}
                        alt="Avatar preview"
                        width={100}
                        height={100}
                        className="rounded-full object-cover border-4 border-[#0A294F]"
                        style={{ width: "100px", height: "100px" }}
                      />
                    ) : editingProfile?.avatar_url && !avatarRemoved ? (
                      <Image
                        src={editingProfile.avatar_url}
                        alt="Avatar"
                        width={100}
                        height={100}
                        className="rounded-full object-cover border-4 border-[#0A294F]"
                        style={{ width: "100px", height: "100px" }}
                      />
                    ) : (
                      <div className="rounded-full bg-[#0A294F] flex items-center justify-center text-white font-semibold text-4xl border-4 border-[#0A294F]"
                        style={{ width: "100px", height: "100px" }}>
                        {name.trim() ? name.charAt(0).toUpperCase() : "?"}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarChange}
                        className="hidden"
                      />
                      <span className="bg-[#28C7D8] text-white py-2 px-4 rounded-lg font-semibold text-sm hover:bg-[#22a8b7] active:scale-95 transition-all duration-150 touch-manipulation inline-block">
                        {avatarPreview || (editingProfile?.avatar_url && !avatarRemoved) ? "Foto wijzigen" : "Foto toevoegen"}
                      </span>
                    </label>
                    {(avatarPreview || (editingProfile?.avatar_url && !avatarRemoved)) && (
                      <button
                        onClick={handleRemoveAvatar}
                        className="bg-[#dc2626] text-white py-2 px-4 rounded-lg font-semibold text-sm hover:bg-[#b91c1c] active:scale-95 transition-all duration-150 touch-manipulation"
                      >
                        Foto verwijderen
                      </button>
                    )}
                  </div>
                </div>

                {/* Name Input */}
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

      {/* Alert/Notification Modal */}
      {alertMessage && (
        <>
          <div
            className="fixed inset-0 bg-[#0A294F] bg-opacity-60 backdrop-blur-sm z-50 transition-opacity duration-300"
            onClick={() => setAlertMessage(null)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ zIndex: 60 }}>
            <div
              className="bg-[#E8F0FF] rounded-2xl p-6 shadow-2xl w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center">
                <div className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center ${alertMessage.type === "error" ? "bg-[#dc2626]" :
                  alertMessage.type === "success" ? "bg-[#10b981]" :
                    "bg-[#28C7D8]"
                  }`}>
                  {alertMessage.type === "error" ? (
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 8V12M12 16H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : alertMessage.type === "success" ? (
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M9 12L11 14L15 10M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M13 16H12V12H11M12 8H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <h3 className={`text-xl font-semibold mb-2 ${alertMessage.type === "error" ? "text-[#dc2626]" :
                  alertMessage.type === "success" ? "text-[#10b981]" :
                    "text-[#28C7D8]"
                  }`}>
                  {alertMessage.type === "error" ? "Fout" :
                    alertMessage.type === "success" ? "Succes" :
                      "Melding"}
                </h3>
                <p className="text-[#000000] text-base mb-6 whitespace-pre-line">
                  {alertMessage.message}
                </p>
                <button
                  onClick={() => setAlertMessage(null)}
                  className={`w-full py-3 px-6 rounded-xl font-semibold text-lg active:scale-95 transition-all duration-150 touch-manipulation ${alertMessage.type === "error" ? "bg-[#dc2626] hover:bg-[#b91c1c] text-white" :
                    alertMessage.type === "success" ? "bg-[#10b981] hover:bg-[#059669] text-white" :
                      "bg-[#28C7D8] hover:bg-[#22a8b7] text-white"
                    }`}
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Confirm Dialog Modal */}
      {confirmDialog && (
        <>
          <div
            className="fixed inset-0 bg-[#0A294F] bg-opacity-60 backdrop-blur-sm z-50 transition-opacity duration-300"
            onClick={() => confirmDialog.onCancel?.() || setConfirmDialog(null)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ zIndex: 60 }}>
            <div
              className="bg-[#E8F0FF] rounded-2xl p-6 shadow-2xl w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center">
                <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center bg-[#28C7D8]">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 9V13M12 17H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-2 text-[#0A294F]">
                  Bevestigen
                </h3>
                <p className="text-[#000000] text-base mb-6 whitespace-pre-line">
                  {confirmDialog.message}
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => confirmDialog.onCancel?.() || setConfirmDialog(null)}
                    className="flex-1 py-3 px-6 bg-white text-[#000000] rounded-xl font-semibold text-lg hover:bg-[#D0E0FF] active:scale-95 transition-all duration-150 touch-manipulation border-2 border-[#0A294F]"
                  >
                    Annuleren
                  </button>
                  <button
                    onClick={() => confirmDialog.onConfirm()}
                    className="flex-1 py-3 px-6 bg-[#dc2626] text-white rounded-xl font-semibold text-lg hover:bg-[#b91c1c] active:scale-95 transition-all duration-150 touch-manipulation"
                  >
                    Verwijderen
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

