import React, { useState } from 'react';
import { db } from '../firebase.config';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

const AddListing: React.FC = () => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [location, setLocation] = useState({ lat: '', lng: '' });

  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await addDoc(collection(db, 'listings'), {
        title,
        description,
        image: imageUrl,
        location: {
          lat: parseFloat(location.lat),
          lng: parseFloat(location.lng),
        },
        createdAt: serverTimestamp(),
      });

      alert('✅ Listing added!');
      navigate('/'); // or wherever you want to go after
    } catch (error) {
      console.error("Error adding listing:", error);
      alert('❌ Failed to add listing.');
    }
  };

  return (
    <div className="min-h-screen bg-deep-blue p-4 text-silver-light">
      <h2 className="text-xl font-bold mb-4">Add a New Box</h2>
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
        <input
          type="text"
          placeholder="Image URL"
          className="input-dark w-full"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
        />
        <div className="flex space-x-2">
          <input
            type="number"
            step="any"
            placeholder="Latitude"
            className="input-dark w-1/2"
            value={location.lat}
            onChange={(e) => setLocation({ ...location, lat: e.target.value })}
            required
          />
          <input
            type="number"
            step="any"
            placeholder="Longitude"
            className="input-dark w-1/2"
            value={location.lng}
            onChange={(e) => setLocation({ ...location, lng: e.target.value })}
            required
          />
        </div>
        <button type="submit" className="btn-primary w-full">Post Box</button>
      </form>
    </div>
  );
};

export default AddListing;