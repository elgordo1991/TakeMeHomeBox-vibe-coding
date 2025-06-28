import React, { useState, useRef, useEffect } from 'react';
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

  // ✅ Set a marker when map is clicked
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
      title: "Box Location",
    });
  };

  // ✅ Initialize the Google Map
  useEffect(() => {
    if (window.google && mapRef.current) {
      const map = new window.google.maps.Map(mapRef.current, {
        center: { lat: 51.505, lng: -0.09 },
        zoom: 14,
        styles: getDarkMapStyles(),
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
      });

      map.addListener('click', handleMapClick);
    }
  }, []);

  // ✅ Submit listing to Firestore and Storage
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!location || !imageFile) {
      alert("Please select a location and image.");
      return;
    }

    setSubmitting(true);

    try {
      const imageRef = ref(storage, `listing-images/${Date.now()}_${imageFile.name}`);
      await uploadBytes(imageRef, imageFile);
      const imageUrl = await getDownloadURL(imageRef);

      await addDoc(collection(db, 'listings'), {
        title,
        description,
        image: imageUrl,
        location,
        createdAt: serverTimestamp(),
      });

      alert('✅ Listing posted!');
      navigate('/');
    } catch (error) {
      console.error("Error posting listing:", error);
      alert('❌ Failed to post listing.');
    } finally {
      setSubmitting(false);
    }
  };

  // ✅ Dark map style for visual consistency
  const getDarkMapStyles = () => [
    { elementType: 'geometry', stylers: [{ color: '#0A0F2C' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#0A0F2C' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#C0C0C0' }] },
    {
      featureType: 'road',
      elementType: 'geometry',
      stylers: [{ color: '#334155' }],
    },
    {
      featureType: 'water',
      elementType: 'geometry',
      stylers: [{ color: '#1E293B' }],
    },
  ];

  return (
    <div className="min-h-screen bg-deep-blue p-4 text-silver-light">
      <h2 className="text-xl font-bold mb-6">📦 Add a New Box</h2>
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
          <label className="block mb-1 text-sm">📍 Tap on the map to select location:</label>
          <div ref={mapRef} className="w-full h-64 rounded-lg border border-silver/30" />
        </div>

        <div>
          <label className="block mb-1 text-sm">📸 Upload a photo:</label>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="w-full text-sm text-silver bg-dark-blue-light p-2 rounded-lg"
            onChange={(e) => setImageFile(e.target.files?.[0] || null)}
            required
          />
        </div>

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