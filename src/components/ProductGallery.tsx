"use client";

import { useState } from "react";
import Image from "next/image";

type ProductGalleryProps = {
  images: string[];
  alt: string;
};

export default function ProductGallery({
  images,
  alt,
}: ProductGalleryProps) {
  const [currentImage, setCurrentImage] = useState(images[0]);

  return (
    <div>
      <div
        style={{
          background: "#f8f6f1",
          borderRadius: "24px",
          padding: "30px",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          marginBottom: "20px",
        }}
      >
        <Image
          src={currentImage}
          alt={alt}
          width={700}
          height={700}
          style={{
            width: "100%",
            maxWidth: "450px",
            height: "auto",
          }}
        />
      </div>

      <div
        style={{
          display: "flex",
          gap: "12px",
          justifyContent: "center",
        }}
      >
        {images.map((image) => (
          <button
            key={image}
            onClick={() => setCurrentImage(image)}
            style={{
              border:
                currentImage === image
                  ? "2px solid #1d4d43"
                  : "1px solid #ddd",
              borderRadius: "12px",
              background: "#fff",
              padding: "6px",
              cursor: "pointer",
            }}
          >
            <Image
              src={image}
              alt={alt}
              width={80}
              height={80}
              style={{
                width: "70px",
                height: "70px",
                objectFit: "contain",
              }}
            />
          </button>
        ))}
      </div>
    </div>
  );
}