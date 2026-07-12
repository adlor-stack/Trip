export default function Home() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      padding: 24,
      fontFamily: 'Inter, sans-serif',
      color: '#f0f1f5',
      background: '#12141c'
    }}>
      <div>
        <p style={{ opacity: 0.6, fontSize: 14 }}>
          Utilisez votre lien privé de voyage,<br />
          au format <code>/trip/votre-code</code>
        </p>
      </div>
    </div>
  );
}
