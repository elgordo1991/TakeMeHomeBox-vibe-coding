import React, { useState, useRef } from 'react';
import { db } from '../firebase.config';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useNavigate } from 'react-router-dom';

const AddListing: React.FC = () => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const mapRef = useRef<HTMLDivElement>(null);
  const markerRef = useRef<any>(null);

  const navigate = useNavigate();
  const storage = getStorage();

  const handleMapClick = (e: google.maps.MapMouseEvent) => {
    if (!e.latLng || !window.google || !mapRef.current) return;

    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    setLocation({ lat, lng });

    const map = markerRef.current?.getMap() || new window.google.maps.Map(mapRef.current);
    if (markerRef.current) markerRef.current.setMap(null);

    markerRef.current = new window.google.maps.Marker({
      position: { lat, lng },
      map,
      title: "Selected Location",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!location || !imageFile) return alert("Please select a location and image.");

    setSubmitting(true);

    try {
      // Upload image to Firebase Storage
      const imageRef = ref(storage, `listing-images/${Date.now()}_${imageFile.name}`);
      await uploadBytes(imageRef, imageFile);
      const imageUrl = await getDownloadURL(imageRef);

      // Save listing to Firestore
      await addDoc(collection(db, 'listings'), {
        title,
        description,
        image: imageUrl,
        location,
        createdAt: serverTimestamp(),
      });

      alert('✅ Listing added!');
      navigate('/');
    } catch (error) {
      console.error("Error submitting listing:", error);
      alert('❌ Failed to add listing.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-deep-blue p-4 text-silver-light">
      <h2 className="text-xl font-bold mb-6">Add a New Box</h2>
      <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
        <input
          type="text"
          placeholder="Title"
          className="input-dark w-full"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />
        <textarea
          placeholder="Description"
          className="input-dark w-full"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />

        <div>
          <label className="block mb-1 text-sm">📍 Tap on the map to choose location:</label>
          <div ref={mapRef} id="addListingMap" className="w-full h-64 rounded-lg border border-silver/30" />
        </div>

        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="input-dark w-full"
          onChange={(e) => setImageFile(e.target.files?.[0] || null)}
          required
        />

        <button
          type="submit"
          disabled={submitting}
          className="btn-primary w-full"
        >
          {submitting ? "Posting..." : "Post Box"}
        </button>
      </form>
    </div>
  );
};

export default AddListing;